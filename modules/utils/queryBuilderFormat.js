'use strict';
import {defaultValue} from "./stuff";
import {
    getFieldConfig, getOperatorConfig
} from './configUtils';

/*
 Build tree to http://querybuilder.js.org/ like format

 Example:
 {
    "condition": "AND",
    "rules": [
        {
            "id": "price",
            "field": "price",
            "type": "double",
            "input": "text",
            "operator": "less",
            "value": "10.25"
        },
        {
            "condition": "OR",
            "rules": [
                {
                    "id": "category",
                    "field": "category",
                    "type": "integer",
                    "input": "select",
                    "operator": "equal",
                    "value": "2"
                },
                {
                    "id": "category",
                    "field": "category",
                    "type": "integer",
                    "input": "select",
                    "operator": "equal",
                    "value": "1"
                }
            ]
        }
    ]
 }
 */
export const queryBuilderFormat = (item, config) => {
    let meta = {
        usedFields: []
    };
    return {..._queryBuilderFormat(item, config, meta), ...meta};
};

//meta is mutable
const _queryBuilderFormat = (item, config, meta) => {
    const type = item.get('type');
    const properties = item.get('properties');
    const children = item.get('children1');
    const id = item.get('id');

    if (type === 'group' && children && children.size) {
        const conjunction = properties.get('conjunction');
        const not = properties.get('not');

        const list = children
            .map((currentChild) => _queryBuilderFormat(currentChild, config, meta))
            .filter((currentChild) => typeof currentChild !== 'undefined');
        if (!list.size)
            return undefined;

        let resultQuery = {};
        resultQuery['rules'] = list.toList();
        resultQuery['condition'] = conjunction.toUpperCase();
        resultQuery['not'] = not;
        return resultQuery;
    } else if (type === 'rule') {
        const operator = properties.get('operator');
        const options = properties.get('operatorOptions');
        let field = properties.get('field');
        let value = properties.get('value');
        let valueSrc = properties.get('valueSrc');
        let valueType = properties.get('valueType');

        let hasUndefinedValues = false;
        value.map((currentValue, ind) => {
            if (currentValue === undefined) {
                hasUndefinedValues = true;
                return undefined;
            }
        });

        if (field == null || operator == null || hasUndefinedValues)
            return undefined;

        const fieldDefinition = getFieldConfig(field, config) || {};
        const operatorDefinition = getOperatorConfig(config, operator, field) || {};
        const fieldType = fieldDefinition.type || "undefined";
        const cardinality = defaultValue(operatorDefinition.cardinality, 1);
        const typeConfig = config.types[fieldDefinition.type] || {};

        //format field
        if (fieldDefinition.tableName) {
          const regex = new RegExp(field.split(config.settings.fieldSeparator)[0])
          field = field.replace(regex, fieldDefinition.tableName)
        }

        if (value.size < cardinality)
            return undefined;

        if (meta.usedFields.indexOf(field) == -1)
            meta.usedFields.push(field);
        value = value.toArray();
        valueSrc = valueSrc.toArray();
        valueType = valueType.toArray();
        let values = [];
        for (let i = 0 ; i < value.length ; i++) {
            const val = {
                type: valueType[i],
                value: value[i],
            };
            values.push(val);
            if (valueSrc[i] == 'field') {
                const secondField = value[i];
                if (meta.usedFields.indexOf(secondField) == -1)
                    meta.usedFields.push(secondField);
            }
        }
        let operatorOptions = options ? options.toJS() : null;
        if (operatorOptions && !Object.keys(operatorOptions).length)
            operatorOptions = null;
        
        let ruleQuery = {
            id,
            field,
            type: fieldType,
            input: typeConfig.mainWidget,
            operator,
        };
        if (operatorOptions)
            ruleQuery.operatorOptions = operatorOptions;
        ruleQuery.values = values;
        return ruleQuery;
    }
    return undefined;
};

