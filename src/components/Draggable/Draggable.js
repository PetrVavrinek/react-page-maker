import React, { Component } from 'react';
import { Motion, spring } from 'react-motion';
import PropTypes from 'prop-types';

import core from '../../core/core';


function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
};

class Draggable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      marginBefore: 0,
      marginAfter: 0
    }

    this.dragElemRef = React.createRef();

    this.defaultMargin = {
      marginTop: 0,
      marginBottom: 0,
      marginRight: 0,
      marginLeft: 0
    };
  }

  componentDidMount() {
    if(this.dragElemRef.current) {
      const style = this.dragElemRef.current.currentStyle || window.getComputedStyle(this.dragElemRef.current);
      const toNum = (m) => {
        m = m.replace("px", "");
        return parseFloat(m);
      }


      this.defaultMargin = {
        marginTop: toNum(style.marginTop),
        marginBottom: toNum(style.marginBottom),
        marginRight: toNum(style.marginRight),
        marginLeft: toNum(style.marginLeft)
      };
    }
  }

  componentWillReceiveProps(nextProps) {
    // update the state once parent state initialisation is done
    if (this.props.initDone !== nextProps.initDone && nextProps.initDone) {
      this.props.updateState();
    }
  }

  _dragEnd = (e) => {
    e.stopPropagation();

    this.dragElemRef.current.classList.remove('before', 'after');

    // done dragging, reset dragged element
    core.setDraggedElement(null);

    this._resetMargin();
  }

  _dragStart = (e) => {
    e.stopPropagation();

    const {
      id,
      type,
      name,
      fields,
      payload,
      parentID,
      dropzoneID,
      removeElement,
      checkAndRemoveElement
    } = this.props;

    const data = {
      id,
      type,
      name,
      payload,
      parentID,
      dropzoneID
    };

    if (fields) {
      data.fields = fields;
    }

    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('data', JSON.stringify(data)); // required, we cann't pass JS object

    // if element is already present in some canvas
    // then set draggedElement, so that this will help to remove the element from previous canvas
    if (dropzoneID) {
      core.setDraggedElement({
        elementID: id,
        dropzoneID,
        removeElement,
        checkAndRemoveElement
      });
    }
  }

  /**
   * function to set drop position.
   * first fine mid of element upon which user is dragging over and
   * based on that decide whether user trying to drop an element above or below
   */
  _onDragOver = (e) => {
    const elemCord = this.dragElemRef.current.getBoundingClientRect();

    if (!this.props.spaceAvailable) {
      return false;
    }

    if (this.props.allowHorizontal) {
      const dragElemX = e.clientX;
      if (dragElemX >= elemCord.x && dragElemX <= elemCord.x + elemCord.width) {
        const midX = elemCord.x + elemCord.width / 2;
        if (dragElemX < midX) {
          this.dragElemRef.current.classList.remove('after');
          this.dragElemRef.current.classList.add('before');
          core.setDropPostion(this.props.index);
        } else {
          this.dragElemRef.current.classList.remove('before');
          this.dragElemRef.current.classList.add('after');
          core.setDropPostion(this.props.index + 1);
        }
      }
    } else {
      const dragElemY = e.clientY;
      const elemHeight = e.target.getBoundingClientRect().height;
      if (dragElemY >= elemCord.y && dragElemY <= elemCord.y + elemCord.height) {
        const midY = elemCord.y + elemCord.height / 2;
        if (dragElemY < midY) {
          this.dragElemRef.current.classList.remove('after');
          this.dragElemRef.current.classList.add('before');


          this.setState({
            marginBefore: elemHeight,
            marginAfter: this.getDefaultMotionStyle().marginAfter
          });

          core.setDropPostion(this.props.index);
        } else {
          this.dragElemRef.current.classList.remove('before');
          this.dragElemRef.current.classList.add('after');

          this.setState({
            marginBefore: this.getDefaultMotionStyle().marginBefore,
            marginAfter: elemHeight,
          });

          core.setDropPostion(this.props.index + 1);
        }
      }
    }

    return true;
  }

  _onDragLeave = (e) => {
    // remove before/after class from dragged element
    this.dragElemRef.current.classList.remove('before', 'after');

    setTimeout(this._resetMargin, 250);
  }

  _resetMargin = () => {
    this.setState({ marginBefore: 0, marginAfter: 0 });
  }

  // default motion style (horizontal/vertical)
  getDefaultMotionStyle = () =>  {
    return {
      marginBefore: this.allowHorizontal ? this.defaultMargin.marginLeft : this.defaultMargin.marginTop,
      marginAfter: this.allowHorizontal ? this.defaultMargin.marginRight : this.defaultMargin.marginBottom
    };
  };

  render() {
    const { elementProps, draggable, allowHorizontal } = this.props;
    let e = null;

    if (this.props.dropzoneID) {
      // add this required function only if element is dropped in canvas
      e = {
        onDragOver: this._onDragOver,
        onDragLeave: this._onDragLeave
      };
    }

    if (draggable) {
      e = {
        ...e,
        draggable: true
      };
    }

    // calculated style (margin = height)
    const getTargetMotionStyle = () => {
      return { marginBefore: spring(this.state.marginBefore), marginAfter: spring(this.state.marginAfter)};
    }


    const getMotionStyle = style => {
      let el_style = {};

      const defBefore = this.getDefaultMotionStyle().marginBefore;
      const before = Math.max(style.marginBefore, defBefore);

      if(style.marginBefore) {
        if(this.props.allowHorizontal)  el_style.marginLeft = before;
        else                            el_style.marginTop = before;
      }

      const defAfter = this.getDefaultMotionStyle().marginAfter;
      const after = Math.max(style.marginAfter, defAfter);

      if(style.marginAfter)
        if(this.props.allowHorizontal)  el_style.marginRight = after;
        else                            el_style.marginBottom = after;

      return el_style;
    }

    const getComponentContent = (style = null) => {
        const props = style ? {style: getMotionStyle(style)} : {};
        return (
          <div
            ref={this.dragElemRef}
            className={`drag-item ${allowHorizontal ? 'inline' : ''}`}
            onDragStart={this._dragStart}
            onDragEnd={this._dragEnd}
            {...elementProps}
            {...e}
            {...props}
          >
            {
              this.props.children
            }
        </div>
      );
    }


    return (

      this.props.enableMotion ? (
        <Motion defaultStyle={this.getDefaultMotionStyle()} style={getTargetMotionStyle()}>
          {
            motionStyle => {
              return getComponentContent(motionStyle)
            }
          }
        </Motion>
      ) : getComponentContent()

    );
  }
}

Draggable.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  initDone: PropTypes.bool,
  index: PropTypes.number,
  allowHorizontal: PropTypes.bool,
  fields: PropTypes.instanceOf(Array),
  draggable: PropTypes.bool,
  spaceAvailable: PropTypes.bool,
  updateState: PropTypes.func,
  dropzoneID: PropTypes.string,
  parentID: PropTypes.string,
  payload: PropTypes.instanceOf(Object),
  elementProps: PropTypes.instanceOf(Object),
  type: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.element),
    PropTypes.element
  ]).isRequired,
  removeElement: PropTypes.func,
  checkAndRemoveElement: PropTypes.func,
  enableMotion: PropTypes.bool
};

Draggable.defaultProps = {
  checkAndRemoveElement: () => (true),
  elementProps: null,
  payload: null,
  draggable: true,
  updateState: () => (true),
  enableMotion: true
};

export default Draggable;
