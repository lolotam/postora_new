// Facebook SDK integration for Login
// Uses the JavaScript SDK approach for better compatibility with Facebook Login for Business

import { getPublicConfig } from "@/lib/publicConfig";

declare global {
  interface Window {
    FB: {
      init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options?: { scope?: string; auth_type?: string },
      ) => void;
      logout: (callback?: () => void) => void;
      getLoginStatus: (callback: (response: FacebookLoginResponse) => void, force?: boolean) => void;
      api: (
        path: string,
        method: string | ((response: unknown) => void),
        params?: Record<string, unknown> | ((response: unknown) => void),
        callback?: (response: unknown) => void,
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

export interface FacebookLoginResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
    grantedScopes?: string;
  };
}

export type FacebookLoginFailureReason =
  | "user_cancelled"
  | "not_authorized"
  | "sdk_load_failed"
  | "sdk_timeout"
  | "popup_blocked"
  | "feature_unavailable"
  | "unknown";

export interface FacebookLoginResult {
  success: boolean;
  response: FacebookLoginResponse;
  failureReason?: FacebookLoginFailureReason;
  diagnostics: {
    origin: string;
    timestamp: string;
    sdkLoaded: boolean;
    loginStatus: string;
  };
}

const SDK_LOAD_TIMEOUT_MS = 15000;

let sdkLoadPromise: Promise<void> | null = null;
let isInitialized = false;
let sdkLoadFailed = false;
let resolvedAppId: string | null = null;

async function getAppId(): Promise<string> {
  if (resolvedAppId) return resolvedAppId;
  const config = await getPublicConfig();
  resolvedAppId = config.FACEBOOK_APP_ID;
  return resolvedAppId;
}

export async function loadFacebookSdk(): Promise<void> {
  // Ensure we have the App ID before loading
  const appId = await getAppId();
  if (!appId) {
    throw new Error("Facebook App ID not configured. Update it in Admin Settings → App Credentials.");
  }

  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      if (!isInitialized) {
        initializeSdk(appId);
      }
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      sdkLoadFailed = true;
      reject(new Error("Facebook SDK failed to load within timeout"));
    }, SDK_LOAD_TIMEOUT_MS);

    window.fbAsyncInit = function () {
      clearTimeout(timeout);
      initializeSdk(appId);
      resolve();
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      clearTimeout(timeout);
      sdkLoadFailed = true;
      sdkLoadPromise = null;
      reject(new Error("Facebook SDK script failed to load. Check network/ad-blocker."));
    };

    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(script, firstScript);
  });

  return sdkLoadPromise;
}

function initializeSdk(appId: string) {
  window.FB.init({
    appId,
    cookie: true,
    xfbml: true,
    version: "v21.0",
  });
  isInitialized = true;
  sdkLoadFailed = false;
  console.log("Facebook SDK initialized with App ID:", appId.slice(0, 4) + "****");
}

function buildDiagnostics(status: string): FacebookLoginResult["diagnostics"] {
  return {
    origin: typeof window !== "undefined" ? window.location.origin : "unknown",
    timestamp: new Date().toISOString(),
    sdkLoaded: !!window.FB && isInitialized,
    loginStatus: status,
  };
}

function classifyFailure(response: FacebookLoginResponse): FacebookLoginFailureReason {
  if (response.status === "not_authorized") {
    return "not_authorized";
  }
  if (response.status === "unknown") {
    return "user_cancelled";
  }
  if (response.status === "connected" && !response.authResponse?.accessToken) {
    return "feature_unavailable";
  }
  return "unknown";
}

export async function facebookLogin(scopes: string[]): Promise<FacebookLoginResult> {
  try {
    await loadFacebookSdk();
  } catch (loadError) {
    const reason: FacebookLoginFailureReason = sdkLoadFailed ? "sdk_load_failed" : "sdk_timeout";
    return {
      success: false,
      response: { status: "unknown" },
      failureReason: reason,
      diagnostics: buildDiagnostics("sdk_not_loaded"),
    };
  }

  return new Promise((resolve) => {
    try {
      window.FB.login(
        (response) => {
          console.log("Facebook login response:", response.status);

          const isSuccess = response.status === "connected" && !!response.authResponse?.accessToken;

          resolve({
            success: isSuccess,
            response,
            failureReason: isSuccess ? undefined : classifyFailure(response),
            diagnostics: buildDiagnostics(response.status),
          });
        },
        {
          scope: scopes.join(","),
          auth_type: "rerequest",
        },
      );
    } catch (err) {
      console.error("FB.login threw:", err);
      resolve({
        success: false,
        response: { status: "unknown" },
        failureReason: "popup_blocked",
        diagnostics: buildDiagnostics("popup_error"),
      });
    }
  });
}

export function getFacebookLoginStatus(): Promise<FacebookLoginResponse> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve({ status: "unknown" });
      return;
    }
    window.FB.getLoginStatus((response) => {
      resolve(response);
    }, true);
  });
}

export function facebookLogout(): Promise<void> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve();
      return;
    }
    window.FB.logout(() => {
      resolve();
    });
  });
}
