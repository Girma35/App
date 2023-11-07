import PropTypes from 'prop-types';
import React from 'react';
import RenderHTML from '@components/RenderHTML';
import reportActionSourcePropType from '@pages/home/report/reportActionSourcePropType';

const propTypes = {
    /** The reportAction's source */
    source: reportActionSourcePropType.isRequired,

    /** The comment's HTML */
    html: PropTypes.string.isRequired,
};

function RenderCommentHTML(props) {
    const html = props.html;

    return <RenderHTML html={props.source === 'email' ? `<email-comment>${html}</email-comment>` : `<comment>${html}</comment>`} />;
}

RenderCommentHTML.propTypes = propTypes;
RenderCommentHTML.displayName = 'RenderCommentHTML';

export default RenderCommentHTML;
