Get-Process | foreach {
    $process = $_
    try {
        $_.Modules | where { $_.FileName -like '*query_engine-windows.dll.node*' } | foreach {
            write-host "Locking Process: $($process.Name) (PID: $($process.Id)) - File: $($_.FileName)"
        }
    } catch {}
}
