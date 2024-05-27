import {useState, useEffect, useCallback, useRef} from 'react'
import {useDropzone} from 'react-dropzone'
import {useGesture} from '@use-gesture/react'
import {useSpring, animated} from '@react-spring/web'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

const showDebug = false 

type Image = {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
  dragging: boolean
  selected: boolean
  zIndex: number
  scale: number
}

function App() {
  const [images, setImages] = useState<Image[]>([])
  const [{ panX, panY }, api] = useSpring(() => ({ panX: 0, panY: 0 }))
  const mousePosition = useMousePosition()
  const maxZIndex = useRef(1)
  const minZIndex = useRef(-1)
  const [cursorGrabStyle, setCursorGrabStyle] = useState('cursor-grab')

  const moveToFront = (id: string) => {
    setImages((prevImages) => {
      const updatedImages = prevImages.map((image) => {
        if (image.id === id) {
          return {...image, zIndex: maxZIndex.current++}
        }
        return image
      })
      return updatedImages
    })
  }

  const moveToBack = (id: string) => {
    setImages((prevImages) => {
      const updatedImages = prevImages.map((image) => {
        if (image.id === id) {
          return {...image, zIndex: minZIndex.current--}
        }
        return image
      })
      return updatedImages
    })
  }

  const unselectAllImages = () => {
    setImages((prevImages) => prevImages.map((image) => ({...image, selected: false})))
  }

  const deleteAllImages = () => {
    setImages([])
  }

  const onDrop = useCallback((acceptedFiles: any) => {
    const file = acceptedFiles[0]

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = () => {
      const img = new Image()
      img.src = reader.result as string

      img.onload = () => {

        let initialX = 0
        if (panX.get() < 0) {
          initialX = 0 + Math.abs(panX.get())
        } else if (panX.get() > 0) {
          initialX = 0 - panX.get()
        }

        let initialY = 0
        if (panY.get() < 0) {
          initialY = 0 + Math.abs(panY.get())
        } else if (panY.get() > 0) {
          initialY = 0 - panY.get()
        }

        let initalScale = 1
        if (img.width > 600) {
          initalScale = 600 / img.width
        }
        if (img.height > 600) {
          initalScale = 600 / img.height
        }

        setImages((prevImages: any) => [
          ...prevImages,
          {
            id: uuidv4(), 
            src: reader.result, 
            x: initialX, 
            y: initialY,
            width: img.width,
            height: img.height,
            dragging: false, 
            selected: false, 
            zIndex: maxZIndex.current++,
            scale: initalScale,
          }
        ])
      }
    }
  }, [])

  // Panning gesture
  const bind = useGesture(
    {
      onDrag: ({offset: [dx, dy]}) => {
        setCursorGrabStyle('cursor-grabbing')
        // Prevent panning when an image is being dragged
        for (let i = 0; i < images.length; i++) {
          if (images[i].dragging) return
        }
        api.start({ panX: dx, panY: dy })
      },
      onDragEnd: () => {
        setCursorGrabStyle('cursor-grab')
      },
    },
  )

  const {getRootProps, getInputProps} = useDropzone({onDrop, noClick: true, noKeyboard: true})

  const handleImageDrag = (id: string, x: number, y: number) => {
    setImages((prevImages) => {
      const updatedImages = prevImages.map((image) => {
        if (image.id === id) {
          return {...image, x: x, y: y, dragging: true}
        }
        return image
      })
      return updatedImages
    })
  }

  const handleImageDragEnd = (id: string) => {
    setImages((prevImages) => {
      const updatedImages = prevImages.map((image) => {
        if (image.id === id) {
          return {...image, dragging: false}
        }
        return image
      })
      return updatedImages
    })
  }

  const handleImageSelect = (id: string) => {
    setImages((prevImages) => prevImages.map((image) => ({...image, selected: false})))
    setImages((prevImages) => {
      const updatedImages = prevImages.map((image) => {
        if (image.id === id) {
          return {...image, selected: !image.selected}
        }
        return image
      })
      return updatedImages
    })
  }

  const handleImageResize = (id: string, newWidth: number, newHeight: number) => {
    setImages((prevImages: any) => {
      const newImages = [...prevImages]
      const index = newImages.findIndex(image => image.id === id)
      if (index !== -1) {
        const scale = newWidth / newImages[index].width
        newImages[index] = { ...newImages[index], width: newWidth, height: newHeight, scale }
      }
      return newImages
    })
  }

  const addImageFromClipboard = (src: string) => {
    const img = new Image();
    img.onload = () => {
      const imageWidth = img.width
      const imageHeight = img.height

      let initialX = 0
      if (panX.get() < 0) {
        initialX = 0 + Math.abs(panX.get())
      } else if (panX.get() > 0) {
        initialX = 0 - panX.get()
      }

      let initialY = 0
      if (panY.get() < 0) {
        initialY = 0 + Math.abs(panY.get())
      } else if (panY.get() > 0) {
        initialY = 0 - panY.get()
      }

      let initialScale = 1
      if (imageWidth > 600) {
        initialScale = 600 / imageWidth
      }
      if (imageHeight > 600) {
        initialScale = 600 / imageHeight
      }

      setImages((prevImages) => [
        ...prevImages,
        {
          id: uuidv4(),
          src,
          x: initialX,
          y: initialY,
          dragging: false,
          selected: false,
          zIndex: maxZIndex.current++,
          width: imageWidth,
          height: imageHeight,
          scale: initialScale,
        }
      ]);
    };
    img.src = src;
  };

  const loadImage = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.src = src;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        setImages((prevImages) => prevImages.filter(image => !image.selected));
      }
    };

    const handleCopy = (event: ClipboardEvent) => {
      const selectedImage = images.find(image => image.selected);
      if (selectedImage) {
        event.clipboardData?.setData('text/plain', selectedImage.src);
        event.preventDefault();
      }
    };

    const handlePaste = async (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (clipboardData) {
        const pastedData = clipboardData.getData('text/plain');
        if (pastedData) {
          const newImage = await loadImage(pastedData);
          addImageFromClipboard(newImage);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [images]);

  return (
    <>
      <div className={`App flex h-[calc(100dvh)] ${cursorGrabStyle}`} style={{touchAction: 'none'}} {...getRootProps()} {...bind()}>
        <input {...getInputProps()} />

        {/* debug */}
        {showDebug && (
          <div className="absolute z-10 top-0 right-0 p-4 text-white bg-black bg-opacity-50">
            <p>MouseX: {mousePosition.x}, MouseY: {mousePosition.y}</p>
            <p>PanX: {Math.floor(panX.get())}, PanY:{Math.floor(panY.get())}</p>
          </div>
        )}
        
        <animated.div
          style={{
            x: panX,
            y: panY,
            width: '100%',
            height: '100%',
            position: 'relative',
            userSelect: 'none',
          }}
        >
        {images.map((image: Image) => 
          <ImageComponent
            key={image.id} 
            image={image}
            onImageDrag={(x: number, y: number) => handleImageDrag(image.id, x, y)}
            onImageDragEnd={() => handleImageDragEnd(image.id)}
            onSelect={() => handleImageSelect(image.id)}
            onResize={(id: string, newWidth: number, newHeight: number) => handleImageResize(id, newWidth, newHeight)}
          />
        )}

        {images.filter(image => image.selected).map((image) => (
          <div key={image.id}>
            <button
              className="absolute flex justify-center items-center cursor-pointer w-10 h-10 text-white rounded bg-indigo-800 bg-opacity-70"
              style={{
                left: `${image.x - 42}px`,
                top: `${image.y}px`,
                zIndex: maxZIndex.current + 1,
                userSelect: 'none',
              }}
              onClick={(e) => {
                e.stopPropagation()
                moveToFront(image.id)
              }}
              >
              <ArrowUpOnSquare />
            </button>
            <button
              className="absolute flex justify-center items-center cursor-pointer w-10 h-10 text-white rounded bg-indigo-800 bg-opacity-70"
              style={{
                left: `${image.x - 42}px`,
                top: `${image.y + 42}px`,
                zIndex: maxZIndex.current + 1,
                userSelect: 'none',
              }}
              onClick={(e) => {
                e.stopPropagation()
                moveToBack(image.id)
              }}
              >
              <ArrowDownOnSquare />
            </button>
            {/* Border */}
            <div
              className="absolute border-2 border-indigo-800 opacity-70 pointer-events-none select-none"
              style={{
                left: `${image.x}px`,
                top: `${image.y}px`,
                width: `${image.width * image.scale}px`,
                height: `${image.height * image.scale}px`,
                zIndex: maxZIndex.current + 1,
              }}
            ></div>
          </div>
        ))}
        </animated.div>
        {/* Side Controls */}
        <div className="absolute top-0 right-0 flex flex-col p-2 gap-2">
          <button className="flex justify-center items-center w-10 h-10 text-white bg-indigo-800 opacity-70 rounded" onClick={() => unselectAllImages()}>
            <HandRaised />
          </button>
          <button className="flex justify-center items-center w-10 h-10 text-white bg-indigo-800 opacity-70 rounded" onClick={() => deleteAllImages()}>
            <DeleteBin /> 
          </button>
        </div>
      </div>
    </>
  )
}

type ImagePropsTypes = {
  image: Image
  onImageDrag: (x: number, y: number) => void
  onImageDragEnd: () => void
  onSelect: () => void
  onResize: (id: string, newWidth: number, newHeight: number) => void
}

function ImageComponent({image, onImageDrag, onImageDragEnd, onSelect, onResize}: ImagePropsTypes) {
  const [size, setSize] = useState({ width: image.width * image.scale, height: image.height * image.scale })

  const handleImageClick = (e: any) => {
    e.stopPropagation()
    onSelect()
  }

  const bind = useGesture(
    {
      onDrag: ({offset: [x, y], event}) => {
        event.stopPropagation()
        onImageDrag(x, y)
        onSelect()
      },
      onDragEnd: ({event}) => {
        event.stopPropagation()
        onImageDragEnd()
      }
    },
  )

  const resizeBind = useGesture({
    onDrag: ({ movement: [mx, my], memo, event }) => {
      event.stopPropagation()
      if (!memo) {
        memo = { width: size.width, height: size.height }
      }
      const newWidth = Math.max(50, memo.width + mx)
      const newHeight = Math.max(50, memo.height + my)
      setSize({ width: newWidth, height: newHeight })
      onResize(image.id, newWidth, newHeight)
      return memo
    },
  })

  const handleMouseDown = (e: any) => {
    e.preventDefault()
  }

  return (
    <animated.div 
      {...bind()} 
      className="absolute"
      style={{
        x: image.x,
        y: image.y,
        touchAction: 'none',
        zIndex: image.zIndex,
      }}
      onClick={handleImageClick}
    >
      {/* debug */}
      {showDebug && (
        <div className="absolute top-0 left-0 p-4 text-white bg-black bg-opacity-50 select-none">
          <p>X: {Math.floor(image.x)}, Y: {Math.floor(image.y)}</p>
          <p>Dragging: {image.dragging ? 'true' : 'false'}</p>
          <p>Selected: {image.selected ? 'true' : 'false'}</p>
          <p>ZIndex: {image.zIndex}</p>
        </div>
      )}

      {image.selected && (
        <div
          {...resizeBind()}
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-indigo-600 cursor-nwse-resize rounded-sm select-none touch-none"
          onMouseDown={handleMouseDown}
        ></div>
      )}
      
      <img 
        src={image.src} 
        draggable={false}
        style={{
          width: `${image.width * image.scale}px`,
          height: `${image.height * image.scale}px`,
          cursor: image.selected ? 'move' : 'default',
        }}
        className="object-cover shadow-lg select-none touch-none"
        alt="image"
      />
    </animated.div>
  )
}

const useMousePosition = () => {
  const [
    mousePosition,
    setMousePosition
  ] = useState({ x: null, y: null })

  useEffect(() => {
    const updateMousePosition = (e: any) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', updateMousePosition)

    return () => {
      window.removeEventListener('mousemove', updateMousePosition)
    }
  }, [])

  return mousePosition
};

const ArrowUpOnSquare = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
    </svg>
  )
}

const ArrowDownOnSquare = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
    </svg>
  )
}

const HandRaised = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
    </svg>
  )
}

const DeleteBin = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

export default App
