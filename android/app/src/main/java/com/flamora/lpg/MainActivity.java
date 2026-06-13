package com.flamora.lpg;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // The app shell loads the live web deployment in a WebView. When the
        // device is offline the WebView would otherwise show the bare system
        // "web page not available" error. We swap in a branded offline screen
        // that lets the user retry once connectivity returns.
        final WebView webView = this.getBridge().getWebView();
        webView.setWebViewClient(new BridgeWebViewClient(this.getBridge()) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    showOfflinePage(view, request.getUrl().toString());
                    return;
                }
                super.onReceivedError(view, request, error);
            }
        });
    }

    private void showOfflinePage(WebView view, String failedUrl) {
        String html = readOfflineHtml().replace("%%RETRY_URL%%", failedUrl == null ? "" : failedUrl);
        // Base the document on the failed URL so navigator.onLine and the retry
        // navigation resolve against the real origin.
        view.loadDataWithBaseURL(failedUrl, html, "text/html", "UTF-8", null);
    }

    private String readOfflineHtml() {
        try (InputStream is = getAssets().open("public/offline.html");
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
            return sb.toString();
        } catch (Exception e) {
            return FALLBACK_OFFLINE_HTML;
        }
    }

    private static final String FALLBACK_OFFLINE_HTML =
        "<!DOCTYPE html><html><head><meta charset=\"UTF-8\" />"
        + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />"
        + "<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;"
        + "font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;padding:24px;text-align:center}"
        + ".c{max-width:340px}h1{font-size:1.25rem;margin:0 0 8px}p{color:#64748b;line-height:1.5;margin:0}"
        + "button{margin-top:24px;width:100%;border:none;border-radius:12px;padding:14px;font-size:1rem;"
        + "font-weight:600;color:#fff;background:#4f46e5}</style></head><body><div class=\"c\">"
        + "<h1>No Internet Connection</h1><p>FLAMORA needs an active internet connection. Please connect to "
        + "Wi-Fi or mobile data, then tap retry to continue.</p>"
        + "<button onclick=\"var u='%%RETRY_URL%%';if(u&&u.indexOf('%%')===-1){window.location.href=u}else{window.location.reload()}\">Retry</button>"
        + "</div></body></html>";
}
