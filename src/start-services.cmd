REM set env=--env production
set env=--env development

start cmd.exe /k "xcopy /s %~dp0\common\*.* %~dp0\APIService\common\ /Y & cd %~dp0\APIService\Common & npm install & cd %~dp0\APIService & npm install & title APIService & node.exe app.js %env% | node_modules\.bin\bunyan"

start cmd.exe /k "xcopy /s %~dp0\common\*.* %~dp0\UserAuthService\common\ /Y & cd %~dp0\UserAuthService\Common & npm install & cd %~dp0\UserAuthService & npm install & title UserAuthService & node.exe app.js %env% | node_modules\.bin\bunyan"

start cmd.exe /k "xcopy /s %~dp0\common\*.* %~dp0\UserDetailsService\common\ /Y & cd %~dp0\UserDetailsService\Common & npm install & cd %~dp0\UserDetailsService & npm install & title UserDetailsService & node.exe app.js %env% | node_modules\.bin\bunyan"

start cmd.exe /k "xcopy /s %~dp0\common\*.* %~dp0\EventsService\common\ /Y & cd %~dp0\EventsService\Common & npm install & cd %~dp0\EventsService & npm install & title EventsService & node.exe app.js %env% | node_modules\.bin\bunyan"

start cmd.exe /k "xcopy /s %~dp0\common\*.* %~dp0\GroupsService\common\ /Y & cd %~dp0\GroupsService\Common & npm install & cd %~dp0\GroupsService & npm install & title GroupsService & node.exe app.js %env% | node_modules\.bin\bunyan"
