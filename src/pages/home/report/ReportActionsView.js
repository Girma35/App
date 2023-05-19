import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import lodashGet from 'lodash/get';
import * as Report from '../../../libs/actions/Report';
import reportActionPropTypes from './reportActionPropTypes';
import Timing from '../../../libs/actions/Timing';
import CONST from '../../../CONST';
import compose from '../../../libs/compose';
import withWindowDimensions, {windowDimensionsPropTypes} from '../../../components/withWindowDimensions';
import {withDrawerPropTypes} from '../../../components/withDrawerState';
import * as ReportScrollManager from '../../../libs/ReportScrollManager';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import Performance from '../../../libs/Performance';
import {withNetwork} from '../../../components/OnyxProvider';
import FloatingMessageCounter from './FloatingMessageCounter';
import networkPropTypes from '../../../components/networkPropTypes';
import ReportActionsList from './ReportActionsList';
import CopySelectionHelper from '../../../components/CopySelectionHelper';
import * as ReportActionsUtils from '../../../libs/ReportActionsUtils';
import reportPropTypes from '../../reportPropTypes';
import * as ReactionList from './ReactionList/ReactionList';
import PopoverReactionList from './ReactionList/PopoverReactionList';
import getIsReportFullyVisible from '../../../libs/getIsReportFullyVisible';

const propTypes = {
    /** The report currently being looked at */
    report: reportPropTypes.isRequired,

    /** Array of report actions for this report */
    reportActions: PropTypes.arrayOf(PropTypes.shape(reportActionPropTypes)),

    /** Whether the composer is full size */
    isComposerFullSize: PropTypes.bool.isRequired,

    /** Information about the network */
    network: networkPropTypes.isRequired,

    ...windowDimensionsPropTypes,
    ...withDrawerPropTypes,
    ...withLocalizePropTypes,
};

const defaultProps = {
    reportActions: [],
};

class ReportActionsView extends React.Component {
    constructor(props) {
        super(props);

        this.didLayout = false;
        this.didSubscribeToReportTypingEvents = false;
        this.unsubscribeVisibilityListener = null;
        this.hasCachedActions = _.size(props.reportActions) > 0;

        // console.log(`~~Monil In constructor`);
        // console.log(this.props.reportActions);
        this.state = {
            isFloatingMessageCounterVisible: false,
        };

        this.currentScrollOffset = 0;
        this.mostRecentIOUReportActionID = ReportActionsUtils.getMostRecentIOURequestActionID(props.reportActions);
        this.trackScroll = this.trackScroll.bind(this);
        this.toggleFloatingMessageCounter = this.toggleFloatingMessageCounter.bind(this);
        this.loadMoreChats = this.loadMoreChats.bind(this);
        this.recordTimeToMeasureItemLayout = this.recordTimeToMeasureItemLayout.bind(this);
        this.scrollToBottomAndMarkReportAsRead = this.scrollToBottomAndMarkReportAsRead.bind(this);
        this.openReportIfNecessary = this.openReportIfNecessary.bind(this);
    }

    componentDidMount() {
        if (!this.isReportFullyVisible()) {
            return;
        }
        this.openReportIfNecessary();
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (!_.isEqual(nextProps.reportActions, this.props.reportActions)) {
            this.mostRecentIOUReportActionID = ReportActionsUtils.getMostRecentIOURequestActionID(nextProps.reportActions);
            return true;
        }

        if (lodashGet(nextProps.network, 'isOffline') !== lodashGet(this.props.network, 'isOffline')) {
            return true;
        }

        if (nextProps.report.isLoadingMoreReportActions !== this.props.report.isLoadingMoreReportActions) {
            return true;
        }

        if (nextProps.report.isLoadingReportActions !== this.props.report.isLoadingReportActions) {
            return true;
        }

        if (nextProps.report.lastReadTime !== this.props.report.lastReadTime) {
            return true;
        }

        if (nextState.isFloatingMessageCounterVisible !== this.state.isFloatingMessageCounterVisible) {
            return true;
        }

        if (nextState.newMarkerReportActionID !== this.state.newMarkerReportActionID) {
            return true;
        }

        if (this.props.isSmallScreenWidth !== nextProps.isSmallScreenWidth) {
            return true;
        }

        if (this.props.isDrawerOpen !== nextProps.isDrawerOpen) {
            return true;
        }

        if (lodashGet(this.props.report, 'hasOutstandingIOU') !== lodashGet(nextProps.report, 'hasOutstandingIOU')) {
            return true;
        }

        if (this.props.isComposerFullSize !== nextProps.isComposerFullSize) {
            return true;
        }

        if (lodashGet(this.props.report, 'statusNum') !== lodashGet(nextProps.report, 'statusNum') || lodashGet(this.props.report, 'stateNum') !== lodashGet(nextProps.report, 'stateNum')) {
            return true;
        }

        return !_.isEqual(lodashGet(this.props.report, 'icons', []), lodashGet(nextProps.report, 'icons', []));
    }

    componentDidUpdate(prevProps) {
        const isReportFullyVisible = this.isReportFullyVisible();

        // When returning from offline to online state we want to trigger a request to OpenReport which
        // will fetch the reportActions data and mark the report as read. If the report is not fully visible
        // then we call ReconnectToReport which only loads the reportActions data without marking the report as read.
        const wasNetworkChangeDetected = lodashGet(prevProps.network, 'isOffline') && !lodashGet(this.props.network, 'isOffline');
        if (wasNetworkChangeDetected) {
            if (isReportFullyVisible) {
                this.openReportIfNecessary();
            } else {
                Report.reconnect(this.props.report.reportID);
            }
        }

        // If the report was previously hidden by the side bar, or the view is expanded from mobile to desktop layout
        // we update the new marker position, mark the report as read, and fetch new report actions
        const didSidebarClose = prevProps.isDrawerOpen && !this.props.isDrawerOpen;
        const didScreenSizeIncrease = prevProps.isSmallScreenWidth && !this.props.isSmallScreenWidth;
        const didReportBecomeVisible = isReportFullyVisible && (didSidebarClose || didScreenSizeIncrease);
        if (didReportBecomeVisible) {
            // this.setState({
            //     newMarkerReportActionID: ReportUtils.isUnread(this.props.report) ? ReportUtils.getNewMarkerReportActionID(this.props.report, this.props.reportActions) : '',
            // });
            this.openReportIfNecessary();
        }

        // Ensures subscription event succeeds when the report/workspace room is created optimistically.
        // Check if the optimistic `OpenReport` or `AddWorkspaceRoom` has succeeded by confirming
        // any `pendingFields.createChat` or `pendingFields.addWorkspaceRoom` fields are set to null.
        // Existing reports created will have empty fields for `pendingFields`.
        const didCreateReportSuccessfully = !this.props.report.pendingFields || (!this.props.report.pendingFields.addWorkspaceRoom && !this.props.report.pendingFields.createChat);
        if (!this.didSubscribeToReportTypingEvents && didCreateReportSuccessfully) {
            Report.subscribeToReportTypingEvents(this.props.report.reportID);
            this.didSubscribeToReportTypingEvents = true;
        }
    }

    componentWillUnmount() {
        if (this.unsubscribeVisibilityListener) {
            this.unsubscribeVisibilityListener();
        }

        if (this.unsubscribeFromNewActionEvent) {
            this.unsubscribeFromNewActionEvent();
        }
        console.log('unsubscribing from report channel: reportID: ', this.props.report.reportID, 'reportName: ', this.props.report.name);
        Report.unsubscribeFromReportChannel(this.props.report.reportID);
    }

    /**
     * @returns {Boolean}
     */
    isReportFullyVisible() {
        return getIsReportFullyVisible(this.props.isDrawerOpen, this.props.isSmallScreenWidth);
    }

    // If the report is optimistic (AKA not yet created) we don't need to call openReport again
    openReportIfNecessary() {
        if (this.props.report.isOptimisticReport) {
            console.log('optimistic report');
            return;
        }

        console.log('opening report');
        Report.openReport(this.props.report.reportID);
    }

    /**
     * Retrieves the next set of report actions for the chat once we are nearing the end of what we are currently
     * displaying.
     */
    loadMoreChats() {
        // Only fetch more if we are not already fetching so that we don't initiate duplicate requests.
        if (this.props.report.isLoadingMoreReportActions) {
            return;
        }

        const oldestReportAction = _.last(this.props.reportActions);

        // Don't load more chats if we're already at the beginning of the chat history
        if (oldestReportAction.actionName === CONST.REPORT.ACTIONS.TYPE.CREATED) {
            return;
        }

        // Retrieve the next REPORT.ACTIONS.LIMIT sized page of comments
        Report.readOldestAction(this.props.report.reportID, oldestReportAction.reportActionID);
    }

    scrollToBottomAndMarkReportAsRead() {
        ReportScrollManager.scrollToBottom();
        Report.readNewestAction(this.props.report.reportID);
    }

    /**
     * Show/hide the new floating message counter when user is scrolling back/forth in the history of messages.
     */
    toggleFloatingMessageCounter() {
        if (this.currentScrollOffset < -200 && !this.state.isFloatingMessageCounterVisible) {
            this.setState({isFloatingMessageCounterVisible: true});
        }

        if (this.currentScrollOffset > -200 && this.state.isFloatingMessageCounterVisible) {
            this.setState({isFloatingMessageCounterVisible: false});
        }
    }

    /**
     * keeps track of the Scroll offset of the main messages list
     *
     * @param {Object} {nativeEvent}
     */
    trackScroll({nativeEvent}) {
        this.currentScrollOffset = -nativeEvent.contentOffset.y;
        this.toggleFloatingMessageCounter();
    }

    /**
     * Runs when the FlatList finishes laying out
     */
    recordTimeToMeasureItemLayout() {
        if (this.didLayout) {
            return;
        }

        this.didLayout = true;
        Timing.end(CONST.TIMING.SWITCH_REPORT, this.hasCachedActions ? CONST.TIMING.WARM : CONST.TIMING.COLD);

        // Capture the init measurement only once not per each chat switch as the value gets overwritten
        if (!ReportActionsView.initMeasured) {
            Performance.markEnd(CONST.TIMING.REPORT_INITIAL_RENDER);
            ReportActionsView.initMeasured = true;
        } else {
            Performance.markEnd(CONST.TIMING.SWITCH_REPORT);
        }
    }

    render() {
        // Comments have not loaded at all yet do nothing
        if (!_.size(this.props.reportActions)) {
            return null;
        }
        // console.log(`REPORT VIEW render - ID(${this.props.report.reportID}):  `, this.props.reportActions);
        return (
            <>
                <FloatingMessageCounter
                    isActive={this.state.isFloatingMessageCounterVisible && !_.isEmpty(this.state.newMarkerReportActionID)}
                    onClick={this.scrollToBottomAndMarkReportAsRead}
                />
                <ReportActionsList
                    report={this.props.report}
                    onScroll={this.trackScroll}
                    onLayout={this.recordTimeToMeasureItemLayout}
                    sortedReportActions={this.props.reportActions}
                    mostRecentIOUReportActionID={this.mostRecentIOUReportActionID}
                    isLoadingMoreReportActions={this.props.report.isLoadingMoreReportActions}
                    loadMoreChats={this.loadMoreChats}
                    newMarkerReportActionID={this.state.newMarkerReportActionID}
                />
                <PopoverReactionList
                    ref={ReactionList.reactionListRef}
                    reportID={this.props.report.reportID}
                />
                <CopySelectionHelper />
            </>
        );
    }
}

ReportActionsView.propTypes = propTypes;
ReportActionsView.defaultProps = defaultProps;

export default compose(Performance.withRenderTrace({id: '<ReportActionsView> rendering'}), withWindowDimensions, withLocalize, withNetwork())(ReportActionsView);
