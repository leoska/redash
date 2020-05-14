import { isEqual, map, find } from "lodash";
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import PropTypes from "prop-types";
import getQueryResultData from "@/lib/getQueryResultData";
import ErrorBoundary, { ErrorMessage } from "@/components/ErrorBoundary";
import Filters, { FiltersType, filterData } from "@/components/Filters";
import { VisualizationType } from "@/visualizations/prop-types";
import registeredVisualizations from "@/visualizations";

function combineFilters(localFilters, globalFilters) {
  // tiny optimization - to avoid unnecessary updates
  if (localFilters.length === 0 || globalFilters.length === 0) {
    return localFilters;
  }

  return map(localFilters, localFilter => {
    const globalFilter = find(globalFilters, f => f.name === localFilter.name);
    if (globalFilter) {
      return {
        ...localFilter,
        current: globalFilter.current,
      };
    }
    return localFilter;
  });
}

function useDimensions(targetRef) {
  const getDimensions = () => {
    return {
      width: targetRef.current ? targetRef.current.offsetWidth : 0,
      height: targetRef.current ? targetRef.current.offsetHeight : 0
    };
  };

  const [dimensions, setDimensions] = useState(getDimensions);

  const handleResize = () => {
    setDimensions(getDimensions());
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useLayoutEffect(() => {
    handleResize();
  }, []);
  return dimensions;
}

export default function VisualizationRenderer(props) {
  const data = useMemo(() => getQueryResultData(props.queryResult), [props.queryResult]);
  const [filters, setFilters] = useState(data.filters);
  const filtersRef = useRef();
  filtersRef.current = filters;

  const targetRef = useRef();
  const size = useDimensions(targetRef);

  const lastOptions = useRef();
  const errorHandlerRef = useRef();

  // Reset local filters when query results updated
  useEffect(() => {
    setFilters(combineFilters(data.filters, props.filters));
  }, [data.filters, props.filters]);

  // Update local filters when global filters changed.
  // For correct behavior need to watch only `props.filters` here,
  // therefore using ref to access current local filters
  useEffect(() => {
    setFilters(combineFilters(filtersRef.current, props.filters));
  }, [props.filters]);

  const filteredData = useMemo(
    () => ({
      columns: data.columns,
      rows: filterData(data.rows, filters),
    }),
    [data, filters]
  );

  const { showFilters, visualization } = props;
  const { Renderer, getOptions } = registeredVisualizations[visualization.type];

  let options = getOptions(visualization.options, data);

  // define pagination size based on context for Table visualization
  if (visualization.type === "TABLE") {
    options.paginationSize = props.context === "widget" ? "small" : "default";
  }

  // Avoid unnecessary updates (which may be expensive or cause issues with
  // internal state of some visualizations like Table) - compare options deeply
  // and use saved reference if nothing changed
  // More details: https://github.com/getredash/redash/pull/3963#discussion_r306935810
  if (isEqual(lastOptions.current, options)) {
    options = lastOptions.current;
  }
  lastOptions.current = options;

  useEffect(() => {
    if (errorHandlerRef.current) {
      errorHandlerRef.current.reset();
    }
  }, [props.visualization.options, data]);


  return (
    <div className="visualization-renderer">
      <ErrorBoundary
        ref={errorHandlerRef}
        renderError={() => <ErrorMessage>Error while rendering visualization.</ErrorMessage>}>
        {showFilters && <Filters filters={filters} onChange={setFilters} />}
        <div ref={targetRef} className="visualization-renderer-wrapper">
          <p>{size.width}</p>
          <p>{size.height}</p>
          <Renderer
            key={`visualization${visualization.id}`}
            options={options}
            data={filteredData}
            size={size}
            visualizationName={visualization.name}
          />
        </div>
      </ErrorBoundary>
    </div>
  );
}

VisualizationRenderer.propTypes = {
  visualization: VisualizationType.isRequired,
  queryResult: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  filters: FiltersType,
  showFilters: PropTypes.bool,
  context: PropTypes.oneOf(["query", "widget"]).isRequired,
};

VisualizationRenderer.defaultProps = {
  filters: [],
  showFilters: true,
};
