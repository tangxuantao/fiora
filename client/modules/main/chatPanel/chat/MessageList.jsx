import React, { Component } from 'react';
import { connect } from 'react-redux';
import immutable from 'immutable';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import autobind from 'autobind-decorator';

import fetch from 'utils/fetch';
import action from '@/state/action';
import UserInfo from '../UserInfo';
import Message from './Message';

function noop() {}

class MessageList extends Component {
    static propTypes = {
        self: PropTypes.string,
        messages: ImmutablePropTypes.list,
        focus: PropTypes.string,
    }
    constructor(...args) {
        super(...args);
        this.state = {
            userInfoDialog: false,
            userInfo: {},
        };
    }
    @autobind
    async handleScroll(e) {
        const { focus, messages, self } = this.props;
        const $div = e.target;
        if ($div.scrollTop === 0 && $div.scrollHeight > $div.clientHeight) {
            let err = null;
            let result = null;
            if (self) {
                [err, result] = await fetch('getLinkmanHistoryMessages', { linkmanId: focus, existCount: messages.size });
            } else {
                [err, result] = await fetch('getDefalutGroupHistoryMessages', { existCount: messages.size });
            }
            if (!err) {
                action.addLinkmanMessages(focus, result);
            }
        }
    }
    @autobind
    showUserInfoDialog(userInfo) {
        this.setState({
            userInfoDialog: true,
            userInfo,
        });
    }
    @autobind
    closeUserInfoDialog() {
        this.setState({
            userInfoDialog: false,
        });
    }
    renderMessage(message) {
        const { self } = this.props;
        const props = {
            key: message.get('_id'),
            avatar: message.getIn(['from', 'avatar']),
            nickname: message.getIn(['from', 'username']),
            time: new Date(message.get('createTime')),
            type: message.get('type'),
            content: message.get('content'),
            isSelf: self === message.getIn(['from', '_id']),
            openUserInfoDialog: noop,
            shouldScroll: this.$list.scrollHeight === this.$list.clientHeight || this.$list.scrollTop > this.$list.scrollHeight - this.$list.clientHeight * 2,
        };
        if (props.type === 'image') {
            props.loading = message.get('loading');
            props.percent = message.get('percent');
        }
        if (!props.isSelf && self) {
            props.openUserInfoDialog = this.showUserInfoDialog.bind(this, message.get('from').toJS());
        }
        return (
            <Message {...props} />
        );
    }
    render() {
        const { messages } = this.props;
        const { userInfoDialog, userInfo } = this.state;
        return (
            <div className="chat-messageList" onScroll={this.handleScroll} ref={i => this.$list = i}>
                {
                    messages.map(message => (
                        this.renderMessage(message)
                    ))
                }
                <UserInfo visible={userInfoDialog} userInfo={userInfo} onClose={this.closeUserInfoDialog} />
            </div>
        );
    }
}

export default connect((state) => {
    const isLogin = !!state.getIn(['user', '_id']);
    let messages = immutable.List();
    if (!isLogin) {
        const defaultGroupMessages = state.getIn(['user', 'linkmans', 0, 'messages']);
        return {
            self: '',
            messages: defaultGroupMessages || messages,
        };
    }

    const self = state.getIn(['user', '_id']);
    const focus = state.get('focus');
    const linkman = state.getIn(['user', 'linkmans']).find(g => g.get('_id') === focus);
    if (linkman) {
        messages = linkman.get('messages');
    }

    return {
        self,
        focus,
        messages,
    };
})(MessageList);
