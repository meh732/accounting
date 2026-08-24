; Inno Setup Script for Persian Accounting System (Hesabdari Meh)
; Produces a single Setup.exe containing both Server and Client with Desktop shortcuts

#define MyAppName "حسابداری مَه"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Hesabdari Meh Co."
#define MyAppExeName "Hesabdari-Meh-Server.exe"

[Setup]
AppId={{C48E72D1-7A3B-49E8-892F-B03F0B438E8E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\HesabdariMeh
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\release
OutputBaseFilename=Hesabdari-Meh-Complete-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\dist-server\Hesabdari-Meh-Server.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\اجرای سرور حسابداری مَه"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\ورود به حسابداری (مرورگر)"; Filename: "http://localhost:3000"
Name: "{autodesktop}\حسابداری مَه"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "اجرای سرور حسابداری پس از پایان نصب"; Flags: nowait postinstall skipifsilent
