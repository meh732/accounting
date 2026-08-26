#include <windows.h>
#include <shellapi.h>
#include <stdio.h>
#include <string.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    char currentDir[MAX_PATH];
    char nodePath[MAX_PATH];
    char serverScript[MAX_PATH];
    char cmdLine[MAX_PATH * 3];

    // Get current directory of this executable
    GetModuleFileNameA(NULL, currentDir, MAX_PATH);
    char *lastBackslash = strrchr(currentDir, '\\');
    if (lastBackslash) {
        *lastBackslash = '\0';
    }

    // Path to bundled node.exe and server bundle
    snprintf(nodePath, MAX_PATH, "%s\\bin\\node.exe", currentDir);
    snprintf(serverScript, MAX_PATH, "%s\\app\\server.bundle.js", currentDir);

    // If bin\node.exe does not exist in subfolder, check local directory
    if (GetFileAttributesA(nodePath) == INVALID_FILE_ATTRIBUTES) {
        snprintf(nodePath, MAX_PATH, "%s\\node.exe", currentDir);
    }
    if (GetFileAttributesA(serverScript) == INVALID_FILE_ATTRIBUTES) {
        snprintf(serverScript, MAX_PATH, "%s\\server.bundle.js", currentDir);
    }

    snprintf(cmdLine, sizeof(cmdLine), "\"%s\" \"%s\"", nodePath, serverScript);

    // Set working directory
    SetCurrentDirectoryA(currentDir);

    // Launch server process in background (or minimized console)
    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE; // Run server silently in background
    ZeroMemory(&pi, sizeof(pi));

    if (CreateProcessA(NULL, cmdLine, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, currentDir, &si, &pi)) {
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
    } else {
        // Fallback using ShellExecute
        ShellExecuteA(NULL, "open", nodePath, serverScript, currentDir, SW_HIDE);
    }

    // Wait 2.5 seconds for server to bind port 3000
    Sleep(2500);

    // Launch Edge or Chrome App Mode or default browser
    char targetUrl[] = "http://localhost:3000";
    char edgePath[MAX_PATH];
    char chromePath[MAX_PATH];
    char appParams[512];

    ExpandEnvironmentStringsA("%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe", edgePath, MAX_PATH);
    if (GetFileAttributesA(edgePath) == INVALID_FILE_ATTRIBUTES) {
        ExpandEnvironmentStringsA("%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe", edgePath, MAX_PATH);
    }

    if (GetFileAttributesA(edgePath) != INVALID_FILE_ATTRIBUTES) {
        snprintf(appParams, sizeof(appParams), "--app=\"%s\" --window-size=1366,768 --user-data-dir=\"%%LOCALAPPDATA%%\\HesabdariMehServerAdmin\"", targetUrl);
        HINSTANCE res = ShellExecuteA(NULL, "open", edgePath, appParams, NULL, SW_SHOWNORMAL);
        if ((INT_PTR)res > 32) return 0;
    }

    ExpandEnvironmentStringsA("%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe", chromePath, MAX_PATH);
    if (GetFileAttributesA(chromePath) == INVALID_FILE_ATTRIBUTES) {
        ExpandEnvironmentStringsA("%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe", chromePath, MAX_PATH);
    }

    if (GetFileAttributesA(chromePath) != INVALID_FILE_ATTRIBUTES) {
        snprintf(appParams, sizeof(appParams), "--app=\"%s\" --window-size=1366,768 --user-data-dir=\"%%LOCALAPPDATA%%\\HesabdariMehServerAdmin\"", targetUrl);
        HINSTANCE res = ShellExecuteA(NULL, "open", chromePath, appParams, NULL, SW_SHOWNORMAL);
        if ((INT_PTR)res > 32) return 0;
    }

    // Fallback default browser
    ShellExecuteA(NULL, "open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
