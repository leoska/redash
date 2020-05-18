import { filter, map, get, initial, last, reduce } from "lodash";
import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import Table from "antd/lib/table";
import Input from "antd/lib/input";
// import Icon from "antd/lib/icon";
import { Icon } from '@ant-design/compatible';
import Popover from "antd/lib/popover";
import { RendererPropTypes } from "@/visualizations/prop-types";

import { prepareColumns, initRows, filterRows, sortRows } from "./utils";

import "./renderer.less";
import {Divider, Tag} from "antd";

function joinColumns(array, separator = ", ") {
  return reduce(
    array,
    (result, item, index) => {
      if (index > 0) {
        result.push(separator);
      }
      result.push(item);
      return result;
    },
    []
  );
}

function getSearchColumns(columns, { limit = Infinity, renderColumn = col => col.title } = {}) {
  const firstColumns = map(columns.slice(0, limit), col => renderColumn(col));
  const restColumns = map(columns.slice(limit), col => col.title);
  if (restColumns.length > 0) {
    return [...joinColumns(firstColumns), ` and ${restColumns.length} others`];
  }
  if (firstColumns.length > 1) {
    return [...joinColumns(initial(firstColumns)), ` and `, last(firstColumns)];
  }
  return firstColumns;
}

function SearchInputInfoIcon({ searchColumns }) {
  return (
    <Popover
      arrowPointAtCenter
      placement="topRight"
      content={
        <div className="table-visualization-search-info-content">
          Search {getSearchColumns(searchColumns, { renderColumn: col => <code key={col.name}>{col.title}</code> })}
        </div>
      }>
      <Icon className="table-visualization-search-info-icon" type="info-circle" theme="filled" />
    </Popover>
  );
}

const SearchInput = React.forwardRef(({ searchColumns, ...props }, ref) => {
  if (searchColumns.length <= 0) {
    return null;
  }

  const searchColumnsLimit = 3;
  return (
    <Input.Search
      {...props}
      ref={ref}
      placeholder={`Search ${getSearchColumns(searchColumns, { limit: searchColumnsLimit }).join("")}...`}
      suffix={searchColumns.length > searchColumnsLimit ? <SearchInputInfoIcon searchColumns={searchColumns} /> : null}
    />
  );
});

export default function Renderer({ options, data, size, context }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState([]);

  const searchColumns = useMemo(() => filter(options.columns, "allowSearch"), [options.columns]);

  const searchInputRef = useRef();
  const onSearchInputChange = useCallback(event => setSearchTerm(event.target.value), [setSearchTerm]);

  const tableColumns = useMemo(() => {
    const searchInput =
      searchColumns.length > 0 ? (
        <SearchInput ref={searchInputRef} searchColumns={searchColumns} onChange={onSearchInputChange} />
      ) : null;
    return prepareColumns(options.columns, searchInput, orderBy, newOrderBy => {
      setOrderBy(newOrderBy);
      // Remove text selection - may occur accidentally
      document.getSelection().removeAllRanges();
    });
  }, [options.columns, searchColumns, searchInputRef, onSearchInputChange, orderBy, setOrderBy]);

  const preparedRows = useMemo(() => sortRows(filterRows(initRows(data.rows), searchTerm, searchColumns), orderBy), [
    data.rows,
    searchTerm,
    searchColumns,
    orderBy,
  ]);

  // If data or config columns change - reset sorting and search
  useEffect(() => {
    setSearchTerm("");
    // Do not use `<Input value={searchTerm}>` because it leads to many renderings and lags on user
    // input. This is the only place where we need to change search input's value from "outer world",
    // so let's use this "hack" for better performance.
    if (searchInputRef.current) {
      // pass value and fake event-like object
      searchInputRef.current.input.setValue("", { target: { value: "" } });
    }
    setOrderBy([]);
  }, [options.columns, data.columns, searchInputRef]);

  if (data.rows.length === 0) {
    return null;
  }

  tableColumns[0].fixed = true;
  tableColumns[1].fixed = true;

  // При слишком маленькой ширине - таблица начинает склеивать столбцы
  const maxWidth = 1200;
  const maxHeight = 500;
  const sizeWidth = size && size.width ? size.width : 0;
  const sizeHeight = size && size.height ? size.height : 0;
  const width = Math.max(sizeWidth, maxWidth);
  const height = Math.max(sizeHeight, maxHeight); // -100 - пока временная мера против 2-ого вертикального скролла

  return (
    <div className="table-visualization-container">
      <Table
        data-percy="show-scrollbars"
        data-test="TableVisualization"
        columns={tableColumns}
        dataSource={preparedRows}
        scroll={{ x: width, y: height }}
        pagination={{
          size: get(options, "paginationSize", ""),
          position: "bottom",
          pageSize: options.itemsPerPage,
          hideOnSinglePage: true,
        }}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
