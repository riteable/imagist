# Imagist

On-the-fly image optimization & manipulation middleware.

## Why

Managing image assets can be a real problem. You often might need several sizes and different aspect ratios to make them fit in the UI. Rendering different versions of an image before uploading them to your server is an option, but it's cumbersome. And design specs change all the time. That's where this middleware comes in handy. You only need to upload one canonical image, so you can request different versions on-the-fly via the `src` attribute of the `img` element. It's basically what paid services like Cloudinary offer.

For example, where you would normally do the following:

    <img src="https://cdn.mydomain.com/path/to/an/image.jpg">

You can now do something like this:

    <img src="https://cdn.mydomain.com/images/path/to/an/image.jpg?w=300&h=300">

Notice the `/images` prefix. This is the route that handles the processing. Also, the query parameters will make sure the image is cropped to 300x300 px. (See all available transformations below.)

**NOTE:** This module doesn't cache or store the processed images anywhere itself. It streams the image directly to the output (browser) while it's processing it. Because the module has to render the image on each request, it works best when the URL is cached by a CDN. That way, only the first request will be slower and heavy on resources while the image is rendered, but all subsequent requests will be handled by the CDN.

## Installation

This is a Node.js module, and can be installed using npm.

    npm i imagist

## Usage

At the moment, only Express, Koa, and Fastify middleware functions are included. If you're using another framework, you can use the `.get()` function for a custom implementation. (See below)

### Express

    const express = require('express')
    const imagist = require('imagist/express')

    const app = express()
    const imagistExpress = imagist({
        host: 'cdn.mydomain.com'
    })

    app.use('/images/*', imagistExpress())

    app.listen(3000)

### Koa

    const Koa = require('koa')
    const Router = require('koa-router')
    const imagist = require('imagist/koa')

    const app = new Koa()
    const router = new Router()

    const imagistKoa = imagist({
        host: 'cdn.mydomain.com'
    })

    router.get('/images/*', imagistKoa())

    app.use(router.routes())

    app.listen(3000)

### Fastify

    const fastify = require('fastify')
    const imagist = require('imagist/fastify')

    const app = fastify()

    const imagistFastify = imagist({
        host: 'cdn.mydomain.com'
    })

    app.get('/images/*', imagistFastify())

    app.listen(3000)

### Custom implementation

With the `.get()` function, an image is fetched from a URL and returned as a stream. In the following example the stream is written to a file.

    const fs = require('fs')
    const imagist = require('imagist')

    imagist()
        .get('https://somedomain.com/path/to/an/image.jpg', {
            w: 300,
            h: 300
        })
        .then(([readStream, mimeType]) => {
            const writeStream = fs.createWriteStream(__dirname + '/300x300.jpg')

            return new Promise((resolve, reject) => {
                readStream.pipe(writeStream)
                    .on('end', resolve)
                    .on('error', reject)
            })
        })
        .catch(console.error)
        .finally(process.exit)

## Options

Available options for the `imagist(opts = {})` function are the following:

- **host**: [String]. Specify the main host where your images are stored. Something like `'mydomain.com'`, or `'mydomain.cloudstorage.com'`. This option is not required, but if you don't set it, you have to set it in the URL when requesting the image, like so:

    `<img src="https://cdn.mydomain.com/images/mydomain.cloudstorage.com/path/to/image.jpg">`

- **whitelist**: [String|Array]. A list of trusted hosts. This whitelist makes sure that only images from trusted hosts are processed. If you've set the `host` option, it is automatically added to the whitelist.

- **ssl**: [Boolean] *(default: `false`)*. Whether or not to request the image through the HTTPS protocol.

## Available transformations

The transformations below are available to use as query parameters when requesting an image, or as the second argument of the `.get(url, {})` function.

- **w**: Desired width in pixels. If it is not specified, it will depend on other parameters what the output width will be. For example, if height is specified, the width will scale relative to the height value respecting the aspect ratio.

- **h**: Desired height in pixels. See width behavior.

- **fit**: Type of fit. Possible values:
    - `'cover'`: *(default)*. Same as CSS `background-size: cover`. If the proportions of the image differ from the element, it is cropped either vertically or horizontally so that no empty space remains.
    - `'contain'`: Same as CSS `background-size: contain`. Scales the image as large as possible without cropping or stretching the image.
    - `'inside'`: Resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.
    - `'outside'`: Resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.
    - `'fill'`: Scales the image to match both width and height, ignoring the aspect ratio.


- **pos**: From where to crop the image (if width and height result in a different aspect ratio). Possible values:
    - `'center'` *(default)*
    - `'top'`
    - `'bottom'`
    - `'left'`
    - `'right'`

    Two additional values, which are experimental and only work if the `fit` option equals `'cover'`:
    - `'entropy'`: Focus on the region with the highest [entropy](https://en.wikipedia.org/wiki/Entropy_%28information_theory%29).
    - `'attention'`: Focus on the region with the highest luminance frequency, color saturation and presence of skin tones.

- **trim**: *(default: `false`)*. Trim unnecessary pixels from the image. Imagine the image having a white (or some other color) border around the edges. This option will crop the image to only contain the necessary part of the image. Possible values: [falsy/truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

- **max**: *(default: `false`)*. Enlarge the image to the specified width and height, if the source image is smaller. Possible values: [falsy/truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).


- **flip**: How to flip/mirror the image. Possible values:
    - `'h'`: Horizontal flip.
    - `'v'`: Vertical flip.
    - `'both'`: Flip both dimensions.


- **q**: Quality of the output image. Possible values between `1` and `100`.

- **i**: [Interpolation algorithm.](https://en.wikipedia.org/wiki/Image_scaling#Algorithms) Possible values:
    - `'nearest'`
    - `'cubic'`
    - `'mitchell'`
    - `'lanczos2'`
    - `'lanczos3'` *(default)*


- **bg**: Background color of the remaining space when the aspect ratio of the processed image is different from the original image. Possible values: A valid hex or RGB(A) color. For example: `'000'`, `'e5e5e5'`, `'32,64,128,0.5'`.

- **r**: Rotate image. Possible values are positive and negative integers/floats. When rotating at angles which aren't divisible by 90 degrees, the image will automatically have a black background. If that's not desired, you can convert the image to a PNG (if it isn't already) with the `fmt` parameter. This will give the image a transparent background. Or you can change the background color with the `bg` parameter.

- **tint**: Tint the image with a given color preserving the luminance. Possible values are valid hex or RGB(A) colors. See `bg` parameter for examples.

- **blur**: Blur the image. Possible values between `0.3` and `1000`.

- **sharp**: Sharpen the image. Possible values: [falsy/truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

- **neg**: Turn the image to a negative. Possible values: [falsy/truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

- **gs**: Turn the image black and white (greyscale). Possible values: [falsy/truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

- **meta**: *(default: `false`)*. Output with metadata (EXIF, XMP, IPTC), if present in the source file. Possible values: [falsy/truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

- **fmt**: Output format. Default behavior is to output the same format as the source. If the source has an unsupported output format, it will default to `'jpeg'`. Possible values:
    - `'jpeg'`
    - `'png'`
    - `'webp'`
