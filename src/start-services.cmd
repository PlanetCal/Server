start cmd.exe /k "cd\ & cd %~dp0\APIService & npm update & echo %~dp0 & node.exe app.js"

start cmd.exe /k "cd\ & cd %~dp0\UserAuthService & npm update & echo %~dp0 & node.exe app.js"

start cmd.exe /k "cd\ & cd %~dp0\UserDetailsService & npm update & echo %~dp0 & node.exe app.js"

start cmd.exe /k "cd\ & cd %~dp0\EventsService & npm update & echo %~dp0 & node.exe app.js"