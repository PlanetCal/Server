start cmd.exe /k "cd\ & cd %~dp0\APIService & npm install & echo %~dp0 & node.exe app.js"

start cmd.exe /k "cd\ & cd %~dp0\UserAuthService & npm install & echo %~dp0 & node.exe app.js"

start cmd.exe /k "cd\ & cd %~dp0\UserDetailsService & npm install & echo %~dp0 & node.exe app.js"

start cmd.exe /k "cd\ & cd %~dp0\EventsService & npm install & echo %~dp0 & node.exe app.js"

start cmd.exe /k "cd\ & cd %~dp0\GroupsService & npm install & echo %~dp0 & node.exe app.js"