Add-Type -AssemblyName System.Drawing

$srcPath = "g:\AURA\frontend\assets\AURA.png"
$destPath = "g:\AURA\frontend\assets\adaptive-icon.png"

$srcImage = [System.Drawing.Image]::FromFile($srcPath)
$newWidth = 1080
$newHeight = 1080
$bmp = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.Clear([System.Drawing.Color]::Transparent)

# Target scale for the foreground image so it fits within the 66% "safe zone"
# 1080 * 0.6 = 648 (to be safe)
$drawWidth = 648
$drawHeight = 648

$x = ($newWidth - $drawWidth) / 2
$y = ($newHeight - $drawHeight) / 2

$graphics.DrawImage($srcImage, $x, $y, $drawWidth, $drawHeight)
$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bmp.Dispose()
$srcImage.Dispose()

Write-Output "Adaptive icon created successfully at $destPath"
