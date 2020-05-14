import { filter, map, get, initial, last, reduce } from "lodash";
import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import Table from "antd/lib/table";
import Input from "antd/lib/input";
import Icon from "antd/lib/icon";
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

  // При слишком маленькой ширине - таблица начинает склеивать столбцы
  const maxWidth = 1200;
  const maxHeight = 400;

  const width = Math.max(size.width, maxWidth);
  const height = Math.max(size.height - 100, maxHeight); // -100 - пока временная мера против 2-ого вертикального скролла

  const columns = [
    {
      title: "Name11212323132132",
      dataIndex: "name",
      key: "name",
      render: text => <a>{text}</a>
    },
    {
      title: "Ageqw qw  qw  qw  qw  qw",
      dataIndex: "age",
      key: "age"
    },
    {
      title: "Addresdasdasdasdadasdas",
      dataIndex: "address",
      key: "address"
    },
    {
      title: "Tags",
      key: "tags",
      dataIndex: "tags",
      render: tags => (
        <span>
        {tags.map(tag => {
          let color = tag.length > 5 ? "geekblue" : "green";
          if (tag === "loser") {
            color = "volcano";
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          );
        })}
      </span>
      )
    },
    {
      title: "Action",
      key: "action",
      render: (text, record) => (
        <span>
        <a>Invite {record.name}</a>
        <Divider type="vertical" />
        <a>Delete</a>
      </span>
      )
    }
  ];

  const data2 = [
    {
      key: "1",
      name: "John Brown",
      age: 32,
      address: "New York No. 1 Lake Park",
      tags: ["nice", "developer"]
    },
    {
      key: "2",
      name: "Jim Green",
      age: 42,
      address: "London No. 1 Lake Park",
      tags: ["loser"]
    },
    {
      key: "3",
      name: "Joe Black",
      age: 32,
      address: "Sidney No. 1 Lake Park",
      tags: ["cool", "teacher"]
    }
  ];

  for (let i = 4; i < 101; ++i)
    data2.push({
      key: `${i}`,
      name: "Joe Black",
      age: 32213123,
      address: "Sidney No. 1 Lake Park",
      tags: ["cool", "teacher"]
    });

  columns[0].fixed = true;
  columns[1].fixed = true;

  tableColumns[0].fixed = true;
  tableColumns[1].fixed = true;

  // return (
  //   <div className="table-visualization-container">
  //     <Table
  //       data-percy="show-scrollbars"
  //       data-test="TableVisualization"
  //       columns={tableColumns}
  //       dataSource={preparedRows}
  //       scroll={{ x: width, y: height }}
  //       pagination={{
  //         size: get(options, "paginationSize", ""),
  //         position: "bottom",
  //         pageSize: options.itemsPerPage,
  //         hideOnSinglePage: true,
  //       }}
  //     />
  //   </div>
  // );

  return (
    <div className="table-visualization-container">
      <Table
        columns={columns}
        dataSource={data2}
        // data-percy="show-scrollbars"
        // data-test="TableVisualization"
        scroll={{ x: 500, y: 500 }}
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
