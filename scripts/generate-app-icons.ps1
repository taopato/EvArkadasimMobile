param(
    [string]$Source = "$PSScriptRoot\..\src\assets\mark-navy.png"
)

Add-Type -AssemblyName System.Drawing

$sourcePath = [IO.Path]::GetFullPath($Source)
$assetsPath = [IO.Path]::GetDirectoryName($sourcePath)
$sourceImage = [Drawing.Bitmap]::FromFile($sourcePath)

try {
    $minX = $sourceImage.Width
    $minY = $sourceImage.Height
    $maxX = -1
    $maxY = -1

    for ($y = 0; $y -lt $sourceImage.Height; $y++) {
        for ($x = 0; $x -lt $sourceImage.Width; $x++) {
            if ($sourceImage.GetPixel($x, $y).A -gt 8) {
                $minX = [Math]::Min($minX, $x)
                $minY = [Math]::Min($minY, $y)
                $maxX = [Math]::Max($maxX, $x)
                $maxY = [Math]::Max($maxY, $y)
            }
        }
    }

    if ($maxX -lt $minX -or $maxY -lt $minY) {
        throw "Kaynak logoda görünür piksel bulunamadı."
    }

    $crop = [Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)

    function New-RoomoraIcon {
        param(
            [string]$Output,
            [int]$LogoSize,
            [bool]$TransparentBackground
        )

        $bitmap = New-Object Drawing.Bitmap 1024, 1024, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            if ($TransparentBackground) {
                $graphics.Clear([Drawing.Color]::Transparent)
            } else {
                $graphics.Clear([Drawing.ColorTranslator]::FromHtml("#F7F9FC"))
            }

            $destination = New-Object Drawing.Rectangle (
                [int]((1024 - $LogoSize) / 2),
                [int]((1024 - $LogoSize) / 2),
                $LogoSize,
                $LogoSize
            )
            $graphics.DrawImage($sourceImage, $destination, $crop, [Drawing.GraphicsUnit]::Pixel)
            $bitmap.Save($Output, [Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }

    New-RoomoraIcon -Output (Join-Path $assetsPath "icon.png") -LogoSize 760 -TransparentBackground $false
    New-RoomoraIcon -Output (Join-Path $assetsPath "adaptive-icon.png") -LogoSize 620 -TransparentBackground $true
}
finally {
    $sourceImage.Dispose()
}
