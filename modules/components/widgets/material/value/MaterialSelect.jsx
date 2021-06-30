import React from "react";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import {mapListValues} from "../../../../utils/stuff";
import FormControl from "@material-ui/core/FormControl";
import omit from "lodash/omit";

export default ({listValues, value, setValue, allowCustomValues, readonly, placeholder, customProps}) => {
  const renderOptions = () =>
    mapListValues(listValues, ({title, value}) => {
      return <MenuItem key={value} value={value}>{title}</MenuItem>;
    });

  const onChange = e => {
    if (e.target.value === undefined)
      return;
    setValue(e.target.value);
  };

  const hasValue = value != null;

  const renderValue = (selectedValue) => {
    if (!readonly && !hasValue)
      return placeholder;
    return mapListValues(listValues, ({title, value}) => (value === selectedValue ? title : null)).filter(v => v !== null).shift();
  };

  return (
    <FormControl>
      <Select
        autoWidth
        displayEmpty
        label={!readonly ? placeholder : ""}
        onChange={onChange}
        value={hasValue ? value : ""}
        disabled={readonly}
        readOnly={readonly}
        renderValue={renderValue}
        {...omit(customProps, ["showSearch"])}
      >
        {renderOptions()}
      </Select>
    </FormControl>
  );
};
