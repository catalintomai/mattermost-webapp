// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Modal} from 'react-bootstrap';
import {FormattedMessage} from 'react-intl';

import {UserProfile} from 'mattermost-redux/src/types/users';
import {Dictionary} from 'mattermost-redux/src/types/utilities';
import {AnalyticsRow} from 'mattermost-redux/types/admin';
import {ActionFunc} from 'mattermost-redux/types/actions';

import {getSiteURL} from 'utils/url';
import {Constants, ModalIdentifiers} from 'utils/constants';
import {t} from 'utils/i18n';

import {trackEvent} from 'actions/diagnostics_actions';
import * as AdminActions from 'actions/admin_actions.jsx';

const StatTypes = Constants.StatTypes;

import * as Utils from 'utils/utils.jsx';

import LoadingWrapper from 'components/widgets/loading/loading_wrapper';

type Props = {
    user: UserProfile;
    license?: Record<string, any>;
    diagnosticId?: string;
    show: boolean;
    closeParentComponent?: () => Promise<void>;
    stats?: Dictionary<number | AnalyticsRow[]>;
    warnMetricStatus: any;
    actions: {
        closeModal: (arg: string) => void;
        getStandardAnalytics: () => any;
        sendWarnMetricAck: (arg0: string, arg1: boolean) => ActionFunc & Partial<{error?: string}>;
    };
}

type State = {
    forceAck: boolean;
    serverError: string | null;
    saving: boolean;
}

export default class WarnMetricAckModal extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            forceAck: false,
            saving: false,
            serverError: null,
        };
    }

    componentDidMount() {
        AdminActions.getStandardAnalytics();
    }

    onContactSupportClick = async (e: any) => {
        trackEvent('admin', 'click_warn_metric_ack_contact_support', {metric: this.props.warnMetricStatus.id});

        if (this.state.saving) {
            return;
        }

        let forceAck = false;
        if (e && e.target && e.target.dataset && e.target.dataset.forceack) {
            forceAck = true;
        }

        const {error} = await this.props.actions.sendWarnMetricAck(this.props.warnMetricStatus.id, forceAck);
        if (error) {
            this.setState({serverError: error, saving: false, forceAck: false});
        } else {
            this.onHideWithParent();
        }
    }

    onHide = () => {
        this.setState({serverError: null, saving: false, forceAck: false});
        this.props.actions.closeModal(ModalIdentifiers.WARN_METRIC_ACK);
    }

    onHideWithParent = () => {
        this.onHide();
        if (this.props.closeParentComponent) {
            this.props.closeParentComponent();
        }
    }

    renderError = () => {
        const {serverError} = this.state;
        if (!serverError) {
            return '';
        }

        const mailRecipient = 'support@mattermost.com';
        const mailSubject = 'Mattermost support request';
        let mailBody = 'Mattermost support request. My team now has ' + this.props.warnMetricStatus.limit + ' users. I am considering enterprise features that can help with scale, such as user management, server clustering and performance monitoring.';
        mailBody += '\r\n';
        mailBody += 'Contact ' + this.props.user.first_name + ' ' + this.props.user.last_name;
        mailBody += '\r\n';
        mailBody += 'Email ' + this.props.user.email;
        mailBody += '\r\n';

        if (this.props.stats && this.props.stats[StatTypes.TOTAL_USERS]) {
            mailBody += 'Registered Users ' + this.props.stats[StatTypes.TOTAL_USERS];
            mailBody += '\r\n';
        }
        mailBody += 'Site URL ' + getSiteURL();
        mailBody += '\r\n';

        mailBody += 'Diagnostic Id ' + this.props.diagnosticId;
        mailBody += '\r\n';

        mailBody += 'If you have any additional inquiries, please contact support@mattermost.com';

        const mailToLinkText = 'mailto:' + mailRecipient + '?cc=' + this.props.user.email + '&subject=' + encodeURIComponent(mailSubject) + '&body=' + encodeURIComponent(mailBody);

        return (
            <div className='form-group has-error'>
                <br/>
                <label className='control-label'>
                    <FormattedMessage
                        id='warn_metric_ack_modal.mailto.message'
                        defaultMessage='Support could not be reached. Please {link}.'
                        values={{
                            link: (
                                <WarnMetricAckErrorLink
                                    url={mailToLinkText}
                                    messageId={t('warn_metric_ack_modal.mailto.link')}
                                    forceAck={true}
                                    defaultMessage={'email us'}
                                    onClickHandler={this.onContactSupportClick}
                                />
                            ),
                        }}
                    />
                </label>
            </div>
        );
    }

    render() {
        const headerTitle = (
            <FormattedMessage
                id='warn_metric_ack_modal.header.title'
                defaultMessage='Upgrade to Mattermost Enterprise Edition'
            />
        );
        const descriptionText = (
            <FormattedMessage
                id='warn_metric_ack_modal.number_of_active_users.description'
                defaultMessage='Mattermost strongly recommends that deployments of over {limit} users upgrade to Mattermost Enterprise E20, which offers features such as user management, server clustering, and performance monitoring'
                values={{
                    limit: this.props.warnMetricStatus.limit,
                }}
            />
        );

        const buttonText = (
            <FormattedMessage
                id='warn_metric_ack_modal.contact_support'
                defaultMessage='Contact us'
            />
        );

        return (
            <Modal
                dialogClassName='a11y__modal'
                show={this.props.show}
                keyboard={false}
                onHide={this.onHide}
                onExited={this.onHide}
                role='dialog'
                aria-labelledby='warnMetricAckHeaderModalLabel'
            >
                <Modal.Header closeButton={true}>
                    <Modal.Title
                        componentClass='h1'
                        id='warnMetricAckHeaderModalLabel'
                    >
                        {headerTitle}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>
                        {descriptionText}
                        <br/>
                        {this.renderError()}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        className='btn btn-primary save-button'
                        data-dismiss='modal'
                        disabled={this.state.saving}
                        autoFocus={true}
                        onClick={this.onContactSupportClick}
                    >
                        <LoadingWrapper
                            loading={this.state.saving}
                            text={Utils.localizeMessage('admin.warn_metric.sending-email', 'Sending email')}
                        >
                            {buttonText}
                        </LoadingWrapper>
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

type ErrorLinkProps = {
    defaultMessage: string;
    messageId: string;
    onClickHandler: (e: React.MouseEvent<HTMLAnchorElement>) => Promise<void>;
    url: string;
    forceAck: boolean;
}

const WarnMetricAckErrorLink: React.FC<ErrorLinkProps> = ({defaultMessage, messageId, onClickHandler, url, forceAck}: ErrorLinkProps) => {
    return (
        <a
            href={url}
            rel='noopener noreferrer'
            target='_blank'
            data-forceAck={forceAck}
            onClick={
                (e) => {
                    onClickHandler(e);
                }
            }
        >
            <FormattedMessage
                id={messageId}
                defaultMessage={defaultMessage}
            />
        </a>
    );
};