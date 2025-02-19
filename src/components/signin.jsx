/* global CONFIG */
import { encode as qsEncode } from 'querystring';
import { memo, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router';
import { useForm, useField } from 'react-final-form-hooks';
import cn from 'classnames';

import { signIn, signedIn, resumeMe } from '../redux/action-creators';
import ErrorBoundary from './error-boundary';
import { FieldsetWrapper } from './fieldset-wrapper';
import { Throbber } from './throbber';
import { providerTitle, useExtAuthProviders } from './ext-auth-helpers';
import { CookiesBanner } from './cookies-banner';
import { ExtAuthButtons } from './ext-auth-buttons';
import UserName from './user-name';

export default memo(function SignInPage() {
  const [providers] = useExtAuthProviders();

  const user = useSelector((state) => state.user || null);
  const isLoggedIn = user?.id && user?.type === 'user';

  const textSignUp = (
    <Link to={`/signup${window.location.search}`} style={{ textDecoration: 'underline' }}>
      Fill a sign up form
    </Link>
  );

  return (
    <div className="box">
      <div className="box-header-timeline" role="heading">
        Welcome to {CONFIG.siteTitle}!
      </div>
      <div className="box-body">
        {isLoggedIn ? (
          <p>
            You are already signed in as <UserName user={user}>{user.screenName}</UserName>.
          </p>
        ) : null}
        <div className="col-md-12">
          <h2 className="p-signin-header">Sign in</h2>
          <CookiesBanner />
          <ErrorBoundary>
            <SignInForm />
            <ResumeForm />
            <ExtAuthSignIn />
          </ErrorBoundary>
          <h3>New to {CONFIG.siteTitle}?</h3>
          {providers.length > 0 ? (
            <>
              <p>
                {textSignUp} to create an account manually or just click on one of the social
                network buttons above.
              </p>
              <p>We will create an account for you based on the data from the social network.</p>
            </>
          ) : (
            <p>{textSignUp} to create an account.</p>
          )}
        </div>
      </div>
      <div className="box-footer" />
    </div>
  );
});

const SignInForm = memo(function SignInForm() {
  const signInStatus = useSelector(({ signInStatus }) => signInStatus);
  const resumeToken = useSelector(({ resumeToken }) => resumeToken);
  const dispatch = useDispatch();

  const form = useForm({
    onSubmit(values) {
      dispatch(signIn(values.username.trim(), values.password.trim()));
    },
    validate(values) {
      return {
        username: values.username.trim() ? undefined : 'Required',
        password: values.password.trim() ? undefined : 'Required',
      };
    },
    initialValues: { username: '', password: '' },
  });

  const username = useField('username', form.form);
  const password = useField('password', form.form);

  return (
    <form onSubmit={form.handleSubmit}>
      <FieldsetWrapper disabled={signInStatus.loading}>
        <div
          className={cn(
            'form-group',
            username.meta.touched && username.meta.invalid && 'has-error',
          )}
        >
          <label htmlFor="username-input" className="control-label">
            Username or email address
          </label>
          <input
            {...username.input}
            id="username-input"
            name="username"
            type="text"
            className="form-control narrow-input"
            inputMode="email"
            autoComplete="username email"
            autoFocus
          />
        </div>
        <div
          className={cn(
            'form-group',
            password.meta.touched && password.meta.invalid && 'has-error',
          )}
        >
          <label htmlFor="password-input" className="control-label">
            Password
          </label>
          <input
            {...password.input}
            id="password-input"
            name="password"
            type="password"
            className="form-control narrow-input"
            autoComplete="current-password"
          />
          <p className="help-block">
            <Link
              to={
                !username.input.value.includes('@')
                  ? '/restore'
                  : `/restore?${qsEncode({ email: username.input.value })}`
              }
            >
              Forgot your password?
            </Link>
          </p>
        </div>
        <div className="form-group">
          {signInStatus.error && !resumeToken && (
            <p className="alert alert-danger" role="alert">
              {signInStatus.errorText}
            </p>
          )}
          <button
            className="btn btn-default"
            type="submit"
            disabled={signInStatus.loading || form.hasValidationErrors}
          >
            Sign in
          </button>{' '}
          {signInStatus.loading && <Throbber />}
        </div>
      </FieldsetWrapper>
    </form>
  );
});

const ExtAuthSignIn = memo(function ExtAuthSignIn() {
  const dispatch = useDispatch();
  const [providers] = useExtAuthProviders();
  const result = useSelector((state) => state.extAuth.signInResult);

  const resultProfileProvider = useMemo(
    () => providers.find((p) => p.id === result?.profile?.provider),
    [providers, result],
  );

  useEffect(() => {
    result.status === 'signed-in' && dispatch(signedIn(result.authToken));
  }, [dispatch, result]);

  if (providers.length === 0) {
    // No allowed providers so do not show anything
    return null;
  }

  return (
    <>
      <p>Or sign in using your social network account:</p>
      <ExtAuthButtons />
      {result.status === 'user-exists' && (
        <div className="alert alert-warning" role="alert">
          <p>
            There is a {CONFIG.siteTitle} account with the email address{' '}
            <strong>{result.profile.email}</strong>, but your account{' '}
            <strong>
              {providerTitle(resultProfileProvider, { withText: false })} {result.profile.name}
            </strong>{' '}
            is not connected to it.
          </p>
          <p>
            If this is you, you should login using the form above with your username/email and
            password or in any other way allowed for your account.
          </p>
          <p>
            If you have forgotten your password, you can{' '}
            <Link to={`/restore?${qsEncode({ email: result.profile.email })}`}>
              reset it and set the new one
            </Link>
            .
          </p>
        </div>
      )}
      {result.status === 'continue' && (
        <div className="alert alert-warning" role="alert">
          <p>
            The{' '}
            <strong>
              {providerTitle(resultProfileProvider, { withText: false })} {result.profile.name}
            </strong>{' '}
            account is not connected to any {CONFIG.siteTitle} account. Do you want to create a new{' '}
            {CONFIG.siteTitle} account based on its data? After creation you will be able to sign in
            using this {providerTitle(resultProfileProvider, { withText: true, withIcon: false })}{' '}
            account.
          </p>
          <p>
            <Link to="/signup" className="btn btn-success">
              Continue to create an account&hellip;
            </Link>
          </p>
        </div>
      )}
    </>
  );
});

function ResumeForm() {
  const dispatch = useDispatch();
  const resumeToken = useSelector(({ resumeToken }) => resumeToken);
  const formStatus = useSelector((state) => state.settingsForms.activateStatus);

  const submit = useCallback(() => dispatch(resumeMe(resumeToken)), [dispatch, resumeToken]);

  if (!resumeToken) {
    return null;
  }

  if (formStatus.success) {
    return (
      <p className="alert alert-success">
        Congratulations, you have successfully restored your account. You can sign in now.
      </p>
    );
  }

  return (
    <div className="alert alert-info">
      <p>Your account is not active, but you can restore the account and all its content.</p>
      <p>
        <button
          className={cn('btn btn-primary', formStatus.loading && 'disabled')}
          onClick={submit}
        >
          {formStatus.loading ? 'Restoring account…' : 'Restore my account'}
        </button>
      </p>
      {formStatus.error && (
        <p className="text-danger">
          Error: {formStatus.errorText}. Try to fill sign in form again.
        </p>
      )}
    </div>
  );
}
