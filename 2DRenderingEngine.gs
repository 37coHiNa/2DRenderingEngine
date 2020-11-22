class Path2D {
  constructor( x, y ) {
    this._x_ = x;
    this._y_ = y;
  }
  get x() {
    return this._x_;
  }
  get y() {
    return this._y_;
  }
}

class Shape2D {
  constructor( paths ) {
    let minX, maxX, minY, maxY;
    this._paths_ = [...paths].map( path => {
      if ( minX == null || minX > path.x ) {
        minX = path.x;
      }
      if ( maxX == null || maxX < path.x ) {
        maxX = path.x;
      }
      if ( minY == null || minY > path.y ) {
        minY = path.y;
      }
      if ( maxY == null || maxY < path.y ) {
        maxY = path.y;
      }
      return new Path2D( path.x, path.y );
    } );
    this._minX_ = minX;
    this._maxX_ = maxX;
    this._minY_ = minY;
    this._maxY_ = maxY;
  }
  get paths() {
    return [...this._paths_];
  }
}

class Circle extends Shape2D {
  constructor( radius ) {
    const n = 30;
    const paths = [];
    for ( let i = 0; i <= n; i++ ) {
      const x = ( Math.cos( i / n * 2 * Math.PI ) * radius ) | 0;
      const y = ( Math.sin( i / n * 2 * Math.PI ) * radius ) | 0;
      paths.push( new Path2D( x, y ) );
    }
    super( paths );
  }
}

class Color {
  constructor( red, green, blue, alpha = 1.0 ) {
    this._red_ = red & 0xff;
    this._green_ = green & 0xff;
    this._blue_ = blue & 0xff;
    this._alpha_ = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  }
  toBytes() {
    const red = this._red_;
    const green = this._green_;
    const blue = this._blue_;
    const alpha = (this._alpha_ * 255) >>> 0;
    return Uint8ClampedArray.of(red, green, blue, alpha);
  }
  toString() {
    const red = this._red_;
    const green = this._green_;
    const blue = this._blue_;
    const alpha = this._alpha_;
    return `{red=${red},green=${green},blue=${blue},alpha=${alpha}}`;
  }
}

class HSVColor extends Color {
  constructor( hue, saturation, value ) {
    const max = value;
    const min = max - saturation / 255 * max;
    hue %= 360;
    if ( hue < 0 ) {
      hue += 360;
    }
    let red, green, blue;
    if ( hue < 60 ) {
      red = max;
      green = hue / 60 * ( max - min ) + min;
      blue = min;
    }else if ( hue >= 60 && hue < 120 ) {
      red = ( 120 - hue ) / 60 * ( max - min ) + min;
      green = max;
      blue = min;
    }else if ( hue >= 120 && hue < 180 ) {
      red = min;
      green = max;
      blue = ( hue - 120 ) / 60 * ( max - min ) + min;
    }else if ( hue >= 180 && hue < 240 ) {
      red = min;
      green = ( 240 - hue ) / 60 * ( max - min ) + min;
      blue = max;
    }else if ( hue >= 240 && hue < 300 ) {
      red = ( hue - 240 ) / 60 * ( max - min ) + min;
      green = min;
      blue = max;
    }else if ( hue >= 300 ) {
      red = max;
      green = min;
      blue = ( 360 - hue ) / 60 * ( max - min ) + min;
    }
    super( red, green, blue );
  }
}

class ImageData {
  constructor( data, width, height ) {
    this._data_ = data;
    this._width_ = width;
    this._height_ = height;
  }
  get data() {
    return this._data_;
  }
  get width() {
    return this._width_;
  }
  get height() {
    return this._height_;
  }
}

const _BYTES_PER_DOT_ = 4;
const _SUBPIXEL_ = 8;
class RenderingContext2D {
  constructor() {
    const width = 400, height = 300;
    this._width_ = 0;
    this._height_ = 0;
    this._imageData_ = new Uint8ClampedArray(0);
    this._resize_(width, height);
  }
  get width() {
    return this._width_;
  }
  set width( newWidth ) {
    this._resize_( newWidth, this._height_ );
  }
  get height() {
    return this._height_;
  }
  set height( newHeight ) {
    this._resize_( this._width_, newHeight );
  }
  _resize_( newWidth, newHeight ) {
    const oldWidth = this._width_;
    const oldHeight = this._height_;
    const oldImageData = this._imageData_;
    this._width_ = newWidth;
    this._height_ = newHeight;
    const newImageData = this._imageData_ = new Uint8ClampedArray( newWidth * newHeight * _BYTES_PER_DOT_ );
    if ( newWidth == oldWidth ) {
      Object.assign( newImageData, oldImageData );
      return;
    }
    const oldRowCount = oldWidth * _BYTES_PER_DOT_;
    const newRowCount = newWidth * _BYTES_PER_DOT_;
    for (let rowIndex = 0; rowIndex < newHeight; rowIndex++) {
      Object.assign(
        newImageData.subarray( newRowCount * rowIndex, newRowCount * ( rowIndex + 1 ) ),
        oldImageData.subarray( oldRowCount * rowIndex, oldRowCount * ( rowIndex + 1 ) )
      );
    }
    return;
  }
  stroke( shape, color, offsetX = 0, offsetY = 0 ) {
    const width = this._width_;
    const height = this._height_;
    let baseX = - shape._minX_,
        baseY = - shape._minY_,
        imageDataX = ( shape._minX_ + offsetX ),
        imageDataY = ( shape._minY_ + offsetY ),
        imageDataWidth = ( shape._maxX_ - shape._minX_ + 1 ),
        imageDataHeight = ( shape._maxY_ - shape._minY_ + 1 );
    if ( imageDataX < 0 ) {
      imageDataWidth += imageDataX;
      baseX += imageDataX;
      imageDataX = 0;
    }
    if ( imageDataY < 0 ) {
      imageDataHeight += imageDataY;
      baseY += imageDataY;
      imageDataY = 0;
    }
    if ( imageDataX > width || imageDataY > height ) {
      return this;
    }
    if ( imageDataX + imageDataWidth > width ) {
      imageDataWidth = width - imageDataX;
    }
    if ( imageDataY + imageDataHeight > height ) {
      imageDataHeight = height - imageDataY;
    }
    const imageData = this.getImageData( imageDataX, imageDataY, imageDataWidth, imageDataHeight );
    const colorBytes = color.toBytes();
    const startPath = shape.paths[ 0 ];
    let [ currentX, currentY ] = [ startPath.x + baseX, startPath.y + baseY ];
    for ( const path of shape.paths.slice( 1 ) ) {
      const [ moveX, moveY ] = [ path.x + baseX, path.y + baseY ];
      let [ x0, y0, x1, y1 ] = [ currentX, currentY, moveX, moveY ];
      const steep = Math.abs( y1 - y0 ) > Math.abs( x1 - x0 );
      if ( steep ) {
        [ x0, x1, y0, y1 ] = [ y0, y1, x0, x1 ];
      }
      if ( x0 > x1 ) {
        [ x0, y0, x1, y1 ] = [ x1, y1, x0, y0 ];
      }
      const deltax = x1 - x0;
      const deltay = Math.abs( y1 - y0 );
      const ystep = ( y0 < y1 ) ? 1 : -1;
      let error = deltax / 2;
      let y = y0;
      for ( let x = x0; x <= x1; x++ ) {
        const [ vx, vy ] = ( steep ) ? [ y, x ] : [ x, y ];
        if ( vx >= 0 && vx <= imageData.width && vy >= 0 && vy <= imageData.height ) {
          const index = ( imageData.width * vy + vx ) * _BYTES_PER_DOT_;
          Object.assign(
            imageData.data.subarray( index, index + _BYTES_PER_DOT_ ),
            colorBytes
          );
        }
        error -= deltay;
        if ( error < 0 ) {
          y += ystep;
          error += deltax;
        }
      }
      [ currentX, currentY ] = [ moveX, moveY ];
    }
    this.putImageData( imageData, imageDataX, imageDataY );
    return this;
  }
  getImageData( x1, y1, width, height ) {
    x1 |= 0;
    y1 |= 0;
    width |= 0;
    height |= 0;
    const x2 = x1 + width;
    const y2 = y1 + height;
    const copy = new Uint8ClampedArray( width * height * _BYTES_PER_DOT_ );
    const rowByteCount = width * _BYTES_PER_DOT_;
    for ( let y = y1, i = 0; y < y2; y++ ) {
      const offset = ( this._width_ * y + x1 ) * _BYTES_PER_DOT_;
      Object.assign(
        copy.subarray( i, i += rowByteCount ),
        this._imageData_.subarray( offset, offset + rowByteCount )
      );
    }
    return new ImageData( copy, width, height );
  }
  putImageData( imageData, x1, y1 ) {
    x1 |= 0;
    y1 |= 0;
    const width = this._width_;
    const height = this._height_;
    const x2 = x1 + imageData.width;
    const y2 = y1 + imageData.height;
    const src = imageData.data;
    const dsc = this._imageData_;
    const rowByteCount = imageData.width * _BYTES_PER_DOT_;
    for ( let y = y1, i = 0; y < y2; y++ ) {
      const offset = ( width * y + x1 ) * _BYTES_PER_DOT_;
      Object.assign(
        dsc.subarray( offset, offset + rowByteCount ),
        src.subarray( i, i += rowByteCount )
      );
    }
    return this;
  }
  toBMP() {
    
    const BMP_BYTES_PER_DOT = 4;
    const BYTES_PER_DOT = 4;
    
    const data = this._imageData_;
    const width = this._width_;
    const height = this._height_;
    
    const rowByteCount = width * BYTES_PER_DOT;
    const paddingCount = ( BMP_BYTES_PER_DOT - ( rowByteCount % BMP_BYTES_PER_DOT ) ) % BMP_BYTES_PER_DOT;
    const imageDataSize = paddingCount == 0 ? data.length : ( rowByteCount + paddingCount ) * height;
    const imageData = new Uint8ClampedArray( imageDataSize );
    const paletteData = new Uint8ClampedArray( 0 ); //フルカラーなら要らない
    for ( let cursor = 0, row = rowByteCount * ( height - 1 ); row >= 0; row -= rowByteCount ) {
      for ( let col = 0; col < rowByteCount; col += BYTES_PER_DOT ) {
        const index = row + col;
        const [ red, green, blue, alpha ] = data.slice( index, index + BYTES_PER_DOT );
        for ( const ori of [　blue, green, red　] ) {
          const color = ( ori * alpha / 0xff ) | 0;
          imageData[ cursor++ ] = color;
        }
      }
    }
    
    const paletteDataSize = 0;
    const informationHeaderSize = 40;
    const fileHeaderSize = 14;
    const imageDataOffset = fileHeaderSize + informationHeaderSize + paletteDataSize;
    const fileSize = fileHeaderSize + informationHeaderSize + paletteDataSize + imageDataSize;
    
    // Bitmap File Header //
    const bfType = "BM".split("").map( ch => ch.charCodeAt( 0 ) );
    const bfSize = UnsignedLong( fileSize );
    const bfReserved1 = UnsignedInt( 0 );
    const bfReserved2 = UnsignedInt( 0 );
    const bfOffBits = UnsignedLong( imageDataOffset );
    
    // Bitmap Information Header //
    const biSize = UnsignedLong( informationHeaderSize );
    const biWidth = Long( width );
    const biHeight = Long( height );
    const biPlanes = UnsignedInt( 1 );
    const biBitCount = UnsignedInt( 24 );
    const biCompression = UnsignedLong( 0 );
    const biSizeImage = UnsignedLong( imageDataSize );
    const biXPixPerMeter = Long( width );
    const biYPixPerMeter = Long( height );
    const biClrUsed = UnsignedLong( 0 );
    const biCirImportant = UnsignedLong( 0 );
    
    const bmpData = new Uint8Array( fileSize );
    let cursor = 0;
    for ( const content of [
      // Bitmap File Header //
      bfType,
      bfSize,
      bfReserved1,
      bfReserved2,
      bfOffBits,
      // Bitmap Information Header //
      biSize,
      biWidth,
      biHeight,
      biPlanes,
      biBitCount,
      biCompression,
      biSizeImage,
      biXPixPerMeter,
      biYPixPerMeter,
      biClrUsed,
      biCirImportant,
      // Palette Data //
      paletteData,
      // Image Data
      imageData
    ] ) {
      Object.assign(
        bmpData.subarray( cursor, cursor += content.length ),
        content
      );
    }
    
    //  const blob = new Blob( [ bmpData.buffer ], { type: "image/bmp" } );
    const blob = Utilities.newBlob( bmpData, MimeType.BMP );
    return blob;
    
  }
}

function UnsignedLong( value ) {
  value = value >>> 0;
  const bytes = Uint8Array.of(
    ( value & 0x000000ff ) >>> 0,
    ( value & 0x0000ff00 ) >>> 8,
    ( value & 0x00ff0000 ) >>> 16,
    ( value & 0xff000000 ) >>> 24
  );
  return bytes;
}

function Long( value ) {
  value = value >> 0;
  const bytes = Uint8Array.of(
    ( value & 0x000000ff ) >>> 0,
    ( value & 0x0000ff00 ) >>> 8,
    ( value & 0x00ff0000 ) >>> 16,
    ( value & 0xff000000 ) >>> 24
  );
  return bytes;
}

function UnsignedInt( value ) {
  value = value >>> 0;
  const bytes = Uint8Array.of(
    ( value & 0x00ff ) >>> 0,
    ( value & 0xff00 ) >>> 8
  );
  return bytes;
}

function Int( value ) {
  value = value >> 0;
  const bytes = Uint8Array.of(
    ( value & 0x00ff ) >>> 0,
    ( value & 0xff00 ) >>> 8
  );
  return bytes;
}

