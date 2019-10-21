import React, { useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { faTimes, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import config from '../config';
import {
  getServerInfo,
  getExtAuthProfiles,
  connectToExtProvider,
  unlinkExternalProfile,
} from '../redux/action-creators';
import { combineAsyncStates, initialAsyncState } from '../redux/async-helpers';
import { Icon } from './fontawesome-icons';
import { Throbber } from './throbber';
import { useExtAuthProviders, providerTitle } from './ext-auth-helpers';

export const UserExtAuthForm = React.memo(function UserExtAuthForm() {
  const dispatch = useDispatch();

  const serverInfoStatus = useSelector((state) => state.serverInfoStatus);
  const existingProfilesStatus = useSelector((state) => state.extAuth.profilesStatus);
  const existingProfiles = useSelector(({ extAuth: { profiles, providers } }) =>
    profiles.filter((p) => providers.includes(p.provider)),
  );

  const loadStatus = useMemo(() => combineAsyncStates(serverInfoStatus, existingProfilesStatus), [
    serverInfoStatus,
    existingProfilesStatus,
  ]);

  useEffect(() => void (serverInfoStatus.initial && dispatch(getServerInfo())), [
    serverInfoStatus,
    dispatch,
  ]);

  useEffect(() => void (existingProfilesStatus.initial && dispatch(getExtAuthProfiles())), [
    dispatch,
    existingProfilesStatus,
  ]);

  if (config.auth.extAuthProviders.length === 0) {
    // External authentication is disabled so do not show anything
    return null;
  }

  return (
    <>
      <h3>Connected social network profiles</h3>
      <p>
        You can use these profiles to sign in to FreeFeed. This will not let FreeFeed do anything on
        your behalf on external sites.
      </p>
      {(loadStatus.loading || loadStatus.initial) && (
        <p>
          <em>Loading...</em>
        </p>
      )}
      {loadStatus.error && (
        <p className="alert alert-danger" role="alert">
          {loadStatus.errorText}
        </p>
      )}
      {loadStatus.success && (
        <>
          {existingProfiles.length === 0 && (
            <p>You don&#x2019;t have any connected profiles yet.</p>
          )}
          {existingProfiles.map((profile) => (
            <ConnectedProfile key={profile.id} profile={profile} />
          ))}
          <ConnectButtons />
        </>
      )}
      <hr />
    </>
  );
});

const ConnectedProfile = React.memo(function ConnectedProfile({ profile }) {
  const disconnectStatus = useSelector(
    (state) => state.extAuth.disconnectStatuses[profile.id] || initialAsyncState,
  );
  const dispatch = useDispatch();
  const doUnlink = useCallback(
    (profileId) => () =>
      confirm('Are you sure you want to disconnect this profile?') &&
      dispatch(unlinkExternalProfile(profileId)),
    [dispatch],
  );

  return (
    <p>
      {providerTitle(profile.provider, { withText: false })} {profile.title}{' '}
      <button
        className="btn btn-default btn-sm"
        onClick={doUnlink(profile.id)}
        disabled={disconnectStatus.loading}
      >
        <Icon icon={faTimes} /> Disconnect
      </button>
      {disconnectStatus.loading && <Throbber />}
      {disconnectStatus.error && (
        <>
          {' '}
          <Icon icon={faExclamationTriangle} className="post-like-fail" />{' '}
          {disconnectStatus.errorText}
        </>
      )}
    </p>
  );
});

const ConnectButtons = React.memo(function ConnectButtons() {
  const [providers, providersStatus] = useExtAuthProviders();
  const connectStatus = useSelector((state) => state.extAuth.connectStatus);
  const dispatch = useDispatch();

  const doLink = useCallback((provider) => () => dispatch(connectToExtProvider(provider)), [
    dispatch,
  ]);

  if (providersStatus.loading) {
    return <p>Loading...</p>;
  }

  if (providers.length === 0) {
    return <p>No supported identity providers.</p>;
  }

  return (
    <>
      <p>
        Connect to{' '}
        {providers.map((p) => (
          <span key={p}>
            <button
              className="btn btn-default"
              onClick={doLink(p)}
              disabled={connectStatus.loading}
            >
              {providerTitle(p)}
            </button>{' '}
          </span>
        ))}
      </p>
      {connectStatus.loading && (
        <p className="alert alert-info" role="alert">
          Connecting...
        </p>
      )}
      {connectStatus.error && (
        <p className="alert alert-danger" role="alert">
          {connectStatus.errorText}
        </p>
      )}
    </>
  );
});
