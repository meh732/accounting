#include <windows.h>
#include <shellapi.h>
#include <stdio.h>
#include <string.h>

#define MAX_URL_LEN 2048

// Magic marker for in-place URL binary patching: 256 bytes buffer
__attribute__((section(".data"))) char EMBEDDED_SERVER_URL[MAX_URL_LEN] = "###HESABDARI_MEH_SERVER_URL_START###http://localhost:3000###HESABDARI_MEH_SERVER_URL_END###";

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    char targetUrl[MAX_URL_LEN] = "http://localhost:3000";

    // Extract embedded URL if present
    char *startMarker = strstr(EMBEDDED_SERVER_URL, "###HESABDARI_MEH_SERVER_URL_START###");
    if (startMarker) {
        startMarker += strlen("###HESABDARI_MEH_SERVER_URL_START###");
        char *endMarker = strstr(startMarker, "###HESABDARI_MEH_SERVER_URL_END###");
        if (endMarker) {
            size_t len = endMarker - startMarker;
            if (len > 0 && len < MAX_URL_LEN - 1) {
                strncpy(targetUrl, startMarker, len);
                targetUrl[len] = '\0';
            }
        }
    }

    // If command line argument passed, override target URL
    if (lpCmdLine && strlen(lpCmdLine) > 0) {
        // Strip quotes if present
        if (lpCmdLine[0] == '"') {
            size_t cmdLen = strlen(lpCmdLine);
            if (cmdLen > 2 && lpCmdLine[cmdLen - 1] == '"') {
                strncpy(targetUrl, lpCmdLine + 1, cmdLen - 2);
                targetUrl[cmdLen - 2] = '\0';
            } else {
                strncpy(targetUrl, lpCmdLine, sizeof(targetUrl) - 1);
            }
        } else {
            strncpy(targetUrl, lpCmdLine, sizeof(targetUrl) - 1);
        }
    }

    char edgePath[MAX_PATH];
    char chromePath[MAX_PATH];
    char appParams[MAX_URL_LEN + 256];

    // 1. Try Microsoft Edge (Built-in WebView2 App Mode on Windows 10/11)
    ExpandEnvironmentStringsA("%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe", edgePath, MAX_PATH);
    if (GetFileAttributesA(edgePath) == INVALID_FILE_ATTRIBUTES) {
        ExpandEnvironmentStringsA("%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe", edgePath, MAX_PATH);
    }

    if (GetFileAttributesA(edgePath) != INVALID_FILE_ATTRIBUTES) {
        snprintf(appParams, sizeof(appParams), "--app=\"%s\" --window-size=1366,768 --user-data-dir=\"%%LOCALAPPDATA%%\\HesabdariMehClient\"", targetUrl);
        HINSTANCE res = ShellExecuteA(NULL, "open", edgePath, appParams, NULL, SW_SHOWNORMAL);
        if ((INT_PTR)res > 32) return 0;
    }

    // 2. Try Google Chrome
    ExpandEnvironmentStringsA("%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe", chromePath, MAX_PATH);
    if (GetFileAttributesA(chromePath) == INVALID_FILE_ATTRIBUTES) {
        ExpandEnvironmentStringsA("%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe", chromePath, MAX_PATH);
    }

    if (GetFileAttributesA(chromePath) != INVALID_FILE_ATTRIBUTES) {
        snprintf(appParams, sizeof(appParams), "--app=\"%s\" --window-size=1366,768 --user-data-dir=\"%%LOCALAPPDATA%%\\HesabdariMehClient\"", targetUrl);
        HINSTANCE res = ShellExecuteA(NULL, "open", chromePath, appParams, NULL, SW_SHOWNORMAL);
        if ((INT_PTR)res > 32) return 0;
    }

    // 3. Fallback: Default Browser
    ShellExecuteA(NULL, "open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
