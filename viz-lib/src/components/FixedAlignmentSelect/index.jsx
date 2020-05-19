import { pickBy, startsWith } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Radio from "antd/lib/radio";
import { Icon } from '@ant-design/compatible';
import Tooltip from "antd/lib/tooltip";

import "./index.less";

export default function FixedAlignmentSelect({ className, ...props }) {
  return (
    // Antd RadioGroup does not use any custom attributes
    <div {...pickBy(props, (v, k) => startsWith(k, "data-"))}>
      <Radio.Group className={cx("fixed-alignment-select", className)} {...props}>
        <Tooltip title="None" mouseEnterDelay={0} mouseLeaveDelay={0}>
          <Radio.Button value="none" data-test="FixedAlignmentSelect.None">
            <Icon type="close" />
          </Radio.Button>
        </Tooltip>
        <Tooltip title="Fixed left" mouseEnterDelay={0} mouseLeaveDelay={0}>
          <Radio.Button value="left" data-test="FixedAlignmentSelect.Left">
            <Icon type="border-left" />
          </Radio.Button>
        </Tooltip>
        <Tooltip title="Fixed right" mouseEnterDelay={0} mouseLeaveDelay={0}>
          <Radio.Button value="right" data-test="FixedAlignmentSelect.Right">
            <Icon type="border-right" />
          </Radio.Button>
        </Tooltip>
      </Radio.Group>
    </div>
  );
}

FixedAlignmentSelect.propTypes = {
  className: PropTypes.string,
};

FixedAlignmentSelect.defaultProps = {
  className: null,
};
