import React, {Component} from "react";
import {
  Query, Builder, Utils, 
  //types:
  ImmutableTree, Config, BuilderProps, JsonTree, JsonLogicTree
} from "react-awesome-query-builder";
import throttle from "lodash/throttle";
import loadConfig from "./config";
import loadedInitValue from "./init_value";
import loadedInitLogic from "./init_logic";

const stringify = JSON.stringify;
const {queryBuilderFormat, jsonLogicFormat, queryString, mongodbFormat, sqlFormat, getTree, checkTree, loadTree, uuid, loadFromJsonLogic, isValidTree} = Utils;
const preStyle = { backgroundColor: "darkgrey", margin: "10px", padding: "10px" };
const preErrorStyle = { backgroundColor: "lightpink", margin: "10px", padding: "10px" };

const initialSkin = "antd";
const emptyInitValue: JsonTree = {id: uuid(), type: "group"};
const loadedConfig = loadConfig(initialSkin);
let initValue: JsonTree = loadedInitValue && Object.keys(loadedInitValue).length > 0 ? loadedInitValue as JsonTree : emptyInitValue;
const initLogic: JsonLogicTree = loadedInitLogic && Object.keys(loadedInitLogic).length > 0 ? loadedInitLogic as JsonLogicTree : undefined;
let initTree: ImmutableTree;
//initTree = checkTree(loadTree(initValue), loadedConfig);
initTree = checkTree(loadFromJsonLogic(initLogic, loadedConfig), loadedConfig); // <- this will work same  

// Trick to hot-load new config when you edit `config.tsx`
const updateEvent = new CustomEvent<CustomEventDetail>("update", { detail: {
  config: loadedConfig,
  _initTree: initTree,
  _initValue: initValue,
} });
window.dispatchEvent(updateEvent);

interface CustomEventDetail {
  config: Config;
  _initTree: ImmutableTree;
  _initValue: JsonTree;
}

interface DemoQueryBuilderState {
  tree: ImmutableTree;
  config: Config;
  skin: String,
}

export default class DemoQueryBuilder extends Component<{}, DemoQueryBuilderState> {
    private immutableTree: ImmutableTree;
    private config: Config;

    componentDidMount() {
      window.addEventListener("update", this.onConfigChanged);
    }

    componentWillUnmount() {
      window.removeEventListener("update", this.onConfigChanged);
    }

    state = {
      tree: initTree, 
      config: loadedConfig,
      skin: initialSkin
    };

    render = () => (
      <div>
        <Query
          {...this.state.config}
          value={this.state.tree}
          onChange={this.onChange}
          renderBuilder={this.renderBuilder}
        />

        <select value={this.state.skin} onChange={this.changeSkin}>
          <option key="vanilla">vanilla</option>
          <option key="antd">antd</option>
          <option key="material">material</option>
        </select>
        <button onClick={this.resetValue}>reset</button>
        <button onClick={this.clearValue}>clear</button>

        <div className="query-builder-result">
          {this.renderResult(this.state)}
        </div>
      </div>
    )

    onConfigChanged = (e: Event) => {
      const {detail: {config, _initTree, _initValue}} = e as CustomEvent<CustomEventDetail>;
      console.log("Updating config...");
      this.setState({
        config,
      });
      initTree = _initTree;
      initValue = _initValue;
    }

    resetValue = () => {
      this.setState({
        tree: initTree, 
      });
    };

    changeSkin = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const skin = e.target.value;
      const config = loadConfig(e.target.value);
      this.setState({
        skin,
        config,
        tree: checkTree(this.state.tree, config)
      });
    };

    clearValue = () => {
      this.setState({
        tree: loadTree(emptyInitValue), 
      });
    };

    renderBuilder = (props: BuilderProps) => (
      <div className="query-builder-container" style={{padding: "10px"}}>
        <div className="query-builder qb-lite">
          <Builder {...props} />
        </div>
      </div>
    )
    
    onChange = (immutableTree: ImmutableTree, config: Config, changedField?: string) => {
      console.log(changedField)
      this.immutableTree = immutableTree;
      this.config = config;
      this.updateResult();
      
      const jsonTree = getTree(immutableTree); //can be saved to backend
    }

    updateResult = throttle(() => {
      this.setState({tree: this.immutableTree, config: this.config});
    }, 100)

    renderResult = ({tree: immutableTree, config} : {tree: ImmutableTree, config: Config}) => {
      const isValid = isValidTree(immutableTree);
      const {logic, data, errors} = jsonLogicFormat(immutableTree, config);
      return (
        <div>
          {isValid ? null : <pre style={preErrorStyle}>{"Tree has errors"}</pre>}
          <br />
          <div>
          stringFormat: 
            <pre style={preStyle}>
              {stringify(queryString(immutableTree, config), undefined, 2)}
            </pre>
          </div>
          <hr/>
          <div>
          humanStringFormat: 
            <pre style={preStyle}>
              {stringify(queryString(immutableTree, config, true), undefined, 2)}
            </pre>
          </div>
          <hr/>
          <div>
          sqlFormat: 
            <pre style={preStyle}>
              {stringify(sqlFormat(immutableTree, config), undefined, 2)}
            </pre>
          </div>
          <hr/>
          <div>
          mongodbFormat: 
            <pre style={preStyle}>
              {stringify(mongodbFormat(immutableTree, config), undefined, 2)}
            </pre>
          </div>
          <hr/>
          <div>
            <a href="http://jsonlogic.com/play.html" target="_blank" rel="noopener noreferrer">jsonLogicFormat</a>: 
            { errors.length > 0 
              && <pre style={preErrorStyle}>
                {stringify(errors, undefined, 2)}
              </pre> 
            }
            { !!logic
              && <pre style={preStyle}>
                {"// Rule"}:<br />
                {stringify(logic, undefined, 2)}
                <br />
                <hr />
                {"// Data"}:<br />
                {stringify(data, undefined, 2)}
              </pre>
            }
          </div>
          <hr/>
          <div>
          Tree: 
            <pre style={preStyle}>
              {stringify(getTree(immutableTree), undefined, 2)}
            </pre>
          </div>
          {/* <hr/>
        <div>
          queryBuilderFormat: 
            <pre style={preStyle}>
              {stringify(queryBuilderFormat(immutableTree, config), undefined, 2)}
            </pre>
        </div> */}
        </div>
      );
    }

}
