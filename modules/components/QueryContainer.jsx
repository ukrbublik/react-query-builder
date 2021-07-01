import React, { Component, PureComponent } from "react";
import PropTypes from "prop-types";
import createTreeStore from "../stores/tree";
import context from "../stores/context";
import {createStore} from "redux";
import {connect, Provider} from "react-redux";
import * as actions from "../actions";
import {extendConfig} from "../utils/configUtils";
import {shallowEqual, immutableEqual} from "../utils/stuff";
import {defaultRoot} from "../utils/defaultUtils";
import {liteShouldComponentUpdate, useOnPropsChanged} from "../utils/reactUtils";
import pick from "lodash/pick";
import Query, {validateAndFixTree} from "./Query";


const configKeys = ["conjunctions", "fields", "types", "operators", "widgets", "settings", "funcs"];


const ConnectedQuery = connect(
  (state) => {
    return {
      tree: state.tree,
      __isInternalValueChange: state.__isInternalValueChange,
      __lastField: state.__lastField,
    };
  },
  null,
  null,
  {
    context
  }
)(Query);
ConnectedQuery.displayName = "ConnectedQuery";


export default class QueryContainer extends Component {
  static propTypes = {
    //config
    conjunctions: PropTypes.object.isRequired,
    fields: PropTypes.object.isRequired,
    types: PropTypes.object.isRequired,
    operators: PropTypes.object.isRequired,
    widgets: PropTypes.object.isRequired,
    settings: PropTypes.object.isRequired,

    onChange: PropTypes.func,
    renderBuilder: PropTypes.func,
    value: PropTypes.any, //instanceOf(Immutable.Map)
  };

  constructor(props, context) {
    super(props, context);
    useOnPropsChanged(this);

    const config = pick(props, configKeys);
    const extendedConfig = extendConfig(config);
    const tree = props.value;
    const validatedTree = tree ? validateAndFixTree(tree, null, config, config) : null;

    const store = createTreeStore({...config, tree: validatedTree});

    this.state = {
      store: createStore(store),
      config: extendedConfig,
    };
  }

  shouldComponentUpdate = liteShouldComponentUpdate(this, {
    value: (nextValue, prevValue, state) => { return false; }
  });

  onPropsChanged(nextProps) {
    // compare configs
    const oldConfig = pick(this.props, configKeys);
    let nextConfig = pick(nextProps, configKeys);
    const isConfigChanged = !shallowEqual(oldConfig, nextConfig, true);
    if (isConfigChanged) {
      nextConfig = extendConfig(nextConfig);
      this.setState({config: nextConfig});
    }
    
    // compare trees
    const storeValue = this.state.store.getState().tree;
    const isTreeChanged = !immutableEqual(nextProps.value, this.props.value) && !immutableEqual(nextProps.value, storeValue);
    if (isTreeChanged) {
      const nextTree = nextProps.value || defaultRoot({ ...nextProps, tree: null });
      const validatedTree = validateAndFixTree(nextTree, null, nextConfig, oldConfig);
      return Promise.resolve().then(() => {
        this.state.store.dispatch(
          actions.tree.setTree(nextProps, validatedTree)
        );
      });
    }
  }

  render() {
    // `get_children` is deprecated!
    const {renderBuilder, get_children, onChange, settings} = this.props;
    const {config, store} = this.state;
    const {renderProvider: QueryWrapper} = settings;

    return (
      <QueryWrapper config={config}>
        <Provider store={store} context={context}>
          <ConnectedQuery
            store={store}
            config={config}
            onChange={onChange}
            renderBuilder={renderBuilder || get_children}
          />
        </Provider>
      </QueryWrapper>
    );
  }
}
