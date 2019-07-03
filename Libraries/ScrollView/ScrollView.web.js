/**
 * Copyright (c) 2015-present, Alibaba Group Holding Limited.
 * All rights reserved.
 *
 * Copyright (c) 2015, Facebook, Inc.  All rights reserved.
 *
 * @providesModule ReactScrollView
 */
'use strict';

import React, { Component} from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import ScrollResponder from 'ReactScrollResponder';
import StyleSheet from 'ReactStyleSheet';
import View from 'ReactView';
import throttle from 'domkit/throttle';
import mixin from 'react-mixin';
import autobind from 'autobind-decorator';

const CONTENT_EXT_STYLE = ['padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'];

/**
 * Component that wraps platform ScrollView while providing
 * integration with touch locking "responder" system.
 *
 * Keep in mind that ScrollViews must have a bounded height in order to work,
 * since they contain unbounded-height children into a bounded container (via
 * a scroll interaction). In order to bound the height of a ScrollView, either
 * set the height of the view directly (discouraged) or make sure all parent
 * views have bounded height. Forgetting to transfer `{flex: 1}` down the
 * view stack can lead to errors here, which the element inspector makes
 * easy to debug.
 *
 * Doesn't yet support other contained responders from blocking this scroll
 * view from becoming the responder.
 */
class ScrollView extends Component {
  static defaultProps = {
    scrollEnabled: true
  };

  state = this.scrollResponderMixinGetInitialState();

  /**
   * Returns a reference to the underlying scroll responder, which supports
   * operations like `scrollTo`. All ScrollView-like components should
   * implement this method so that they can be composed while providing access
   * to the underlying scroll responder's methods.
   */
  getScrollResponder() {
    return this;
  }

  getInnerViewNode() {
    return this._innerRef;
  }

  scrollTo(opts: { x?: number, y?: number, animated?: boolean }) {
    // $FlowFixMe - Don't know how to pass Mixin correctly. Postpone for now
    // this.getScrollResponder().scrollResponderScrollTo(destX || 0, destY || 0);
    if (typeof opts === 'number') {
      opts = { y: opts, x: arguments[1] };
    }

    if (opts.animated) {
      this.getScrollResponder().scrollResponderScrollTo(opts.x || 0, opts.y || 0);
    } else {
      this.getScrollResponder().scrollResponderScrollWithouthAnimationTo(opts.x || 0, opts.y || 0);
    }
  }

  handleScroll(e: Event) {
    // if (__DEV__) {
    //   if (this.props.onScroll && !this.props.scrollEventThrottle) {
    //     console.log(
    //       'You specified `onScroll` on a <ScrollView> but not ' +
    //       '`scrollEventThrottle`. You will only receive one event. ' +
    //       'Using `16` you get all the events but be aware that it may ' +
    //       'cause frame drops, use a bigger number if you don\'t need as ' +
    //       'much precision.'
    //     );
    //   }
    // }
    // if (Platform.OS === 'android') {
    //   if (this.props.keyboardDismissMode === 'on-drag') {
    //     dismissKeyboard();
    //   }
    // }

    if (!this._scrollViewDom)
      this._scrollViewDom = ReactDOM.findDOMNode(this._ref);

    e.nativeEvent = e.nativeEvent || {};
    e.nativeEvent.contentOffset = {x:this._scrollViewDom.scrollLeft, y:this._scrollViewDom.scrollTop};

    this.props.onScroll && this.props.onScroll(e);
  }

  _captureInnerRef = ref => {
    this._innerRef = ref;
  }

  _captureRef = ref => {
    this._ref = ref;
  }

  render() {
    let {
      style,
      ...otherProps
    } = this.props;

    let contentContainerExtStyle = {};

    if (style) {
      for (let i = 0; i < CONTENT_EXT_STYLE.length; i++) {
        if (typeof style[CONTENT_EXT_STYLE[i]] === 'number') {
          contentContainerExtStyle[CONTENT_EXT_STYLE[i]] = style[CONTENT_EXT_STYLE[i]];
        }
      }
    }

    let contentContainerStyle = [
      styles.contentContainer,
      this.props.horizontal && styles.contentContainerHorizontal,
      this.props.contentContainerStyle,
      contentContainerExtStyle,
    ];
    // if (__DEV__ && this.props.style) {
    //   let style = flattenStyle(this.props.style);
    //   let childLayoutProps = ['alignItems', 'justifyContent']
    //     .filter((prop) => style && style[prop] !== undefined);
    //   invariant(
    //     childLayoutProps.length === 0,
    //     'ScrollView child layout (' + JSON.stringify(childLayoutProps) +
    //       ') must by applied through the contentContainerStyle prop.'
    //   );
    // }

    let contentContainer =
      <View
        ref={this._captureInnerRef}
        style={contentContainerStyle}
        removeClippedSubviews={this.props.removeClippedSubviews}
        collapsable={false}>
        {this.props.children}
      </View>;

    let alwaysBounceHorizontal =
      this.props.alwaysBounceHorizontal !== undefined ?
        this.props.alwaysBounceHorizontal :
        this.props.horizontal;

    let alwaysBounceVertical =
      this.props.alwaysBounceVertical !== undefined ?
        this.props.alwaysBounceVertical :
        !this.props.horizontal;

    let handleScroll = () => {};
    if (this.props.scrollEventThrottle && this.props.onScroll) {
      if (this.props.scrollEventThrottleDisable) {
        handleScroll = this.handleScroll;
      } else {
        handleScroll = throttle(this.handleScroll, this.props.scrollEventThrottle ? 1000 / this.props.scrollEventThrottle : 1000);
      }
    }

    let scrollIndicator = {
      overflowX: 'hidden',
      overflowY: 'hidden',
    };
    if (this.props.scrollEnabled) {
      if (!(this.props.showsHorizontalScrollIndicator === false ||
              this.props.showsVerticalScrollIndicator === false)) {
        if (this.props.horizontal) {
          scrollIndicator.overflowX = 'auto';
        } else {
          scrollIndicator.overflowY = 'auto';
        }
      }
    }

    let props = {
      ...otherProps,
      alwaysBounceHorizontal,
      alwaysBounceVertical,
      style: ([
        styles.base,
        scrollIndicator,
        this.props.style,
      ]: ?Array<any>),
      onTouchStart: this.scrollResponderHandleTouchStart,
      onTouchMove: this.scrollResponderHandleTouchMove,
      onTouchEnd: this.scrollResponderHandleTouchEnd,
      onScrollBeginDrag: this.scrollResponderHandleScrollBeginDrag,
      onScrollEndDrag: this.scrollResponderHandleScrollEndDrag,
      onMomentumScrollBegin: this.scrollResponderHandleMomentumScrollBegin,
      onMomentumScrollEnd: this.scrollResponderHandleMomentumScrollEnd,
      onStartShouldSetResponder: this.scrollResponderHandleStartShouldSetResponder,
      onStartShouldSetResponderCapture: this.scrollResponderHandleStartShouldSetResponderCapture,
      // onScrollShouldSetResponder: this.scrollResponderHandleScrollShouldSetResponder,
      // onScroll: handleScroll,
      onScrollShouldSetResponder: handleScroll,
      // replace onScroll in the props
      onScroll: () => {},
      onResponderGrant: this.scrollResponderHandleResponderGrant,
      onResponderTerminationRequest: this.scrollResponderHandleTerminationRequest,
      onResponderTerminate: this.scrollResponderHandleTerminate,
      onResponderRelease: this.scrollResponderHandleResponderRelease,
      onResponderReject: this.scrollResponderHandleResponderReject,
    };

    return (
      <View {...props} ref={this._captureRef}>
        {contentContainer}
      </View>
    );
  }
};

let styles = StyleSheet.create({
  base: {
    WebkitOverflowScrolling: 'touch',
    flex: 1,
  },
  contentContainer: {
    position: 'absolute',
    minWidth: '100%',
  },
  contentContainerHorizontal: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
});

mixin.onClass(ScrollView, ScrollResponder.Mixin);
autobind(ScrollView);

ScrollView.isReactNativeComponent = true;

export default ScrollView;
