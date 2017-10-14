REM set env=production
set env=development

start cmd.exe /k "cd %~dp0\Common & npm install & cd %~dp0\APIService & npm install & title APIService & node.exe app.js --env %env% | node_modules\.bin\bunyan"

start cmd.exe /k "cd %~dp0\Common & npm install & cd %~dp0\UserAuthService & npm install & title UserAuthService & node.exe app.js --env %env% | node_modules\.bin\bunyan"

start cmd.exe /k "cd %~dp0\Common & npm install & cd %~dp0\UserDetailsService & npm install & title UserDetailsService & node.exe app.js --env %env% | node_modules\.bin\bunyan"

start cmd.exe /k "cd %~dp0\Common & npm install & cd %~dp0\EventsService & npm install & title EventsService & node.exe app.js --env %env% | node_modules\.bin\bunyan"

start cmd.exe /k "cd %~dp0\Common & npm install & cd %~dp0\GroupsService & npm install & title GroupsService & node.exe app.js --env %env% | node_modules\.bin\bunyan"