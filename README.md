# Imagist

On-the-fly image optimization & manipulation middleware.

## Why

Managing image assets can be a a real problem. You often might need different sizes with different aspect ratios to fit perfectly within the context of your UI elements. Rendering different versions of an image before uploading them to your server is an option, but what if the design of the UI changes? Which it most certainly will. You'll probably need to render new versions of all those images all over again. That's where this middleware comes in handy. You only need to upload one canonical image, and request different versions on-the-fly via the `src` attribute of the `img` element. It's basically what paid services like [Cloudinary](https://cloudinary.com) offer.

For example, where you would normally do the following:
    
    <img src="https://cdn.mydomain.com/path/to/an/image.jpg">

You can now do something like this:
    
    <img src="https://cdn.mydomain.com/images/path/to/an/image.jpg?w=300&h=300">
    
Notice the `/images/` prefix. This is the route that handles the processing. The query parameters will make sure the image is cropped to 300x300 px. (See all available transformations below.)

**NOTE:** Because the module has to process and render a new image on each request, it works best when the URL is cached by a CDN. That way, only the first request will be slow and heavy on resources as the image is rendered, but all subsequent requests will be handled by the CDN.

## Installation

    npm i imagist

## Usage

At the moment, only Express, Koa, and Fastify middleware are included. If you're using another framework, you can use the `.get()` function for a custom implementation. (See below)

### Express

    const express = require('express')
    const imagist = require('imagist')

    const app = express()
    const imagistExpress = imagist({
        host: 'cdn.mydomain.com'
    }).express

    app.use('/images/*', imagistExpress())

    app.listen(3000)
    
### Koa

    const Koa = require('koa')
    const Router = require('koa-router')
    const imagist = require('imagist')

    const app = new Koa()
    const router = new Router()

    const imagistKoa = imagist({
        host: 'cdn.mydomain.com'
    }).koa

    router.get('/images/*', imagistKoa())

    app.use(router.routes())

    app.listen(3000)

### Fastify

    const fastify = require('fastify')
    const imagist = require('imagist')

    const app = fastify()
    
    const imagistFastify = imagist({
        host: 'cdn.mydomain.com'
    }).fastify

    app.get('/images/*', imagistFastify())

    app.listen(3000)
    
### Custom implementation

With the `.get()` function, an image is fetched from a URL and returned as a stream. In the following example we're writing the stream to a file.

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
    
## Available transformations

- **w**: Desired width in pixels. If it is not specified, it will depend on other parameters what the output width will be. For example, if height is specified, the width will scale relative to the height value respecting the aspect ratio.

- **h**: Desired height in pixels. See width behavior.

- **fit**: Type of fit. Possible values:
    - `'cover'` *(default)*: Same as CSS `background-size: cover`. If the proportions of the image differ from the element, it is cropped either vertically or horizontally so that no empty space remains.
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
