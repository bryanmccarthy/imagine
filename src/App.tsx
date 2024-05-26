import {useState, useEffect, useCallback, useRef} from 'react'
import {useDropzone} from 'react-dropzone'
import {useGesture} from '@use-gesture/react'
import {useSpring, animated} from '@react-spring/web'
import { v4 as uuidv4 } from 'uuid'

const showDebug = true

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
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }))
  const mousePosition = useMousePosition() || {x: 0, y: 0}
  const maxZIndex = useRef(1)
  const minZIndex = useRef(-1)

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

  const onDrop = useCallback((acceptedFiles: any) => {
    const file = acceptedFiles[0]

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = () => {
      const img = new Image()
      img.src = reader.result as string

      img.onload = () => {
        let initialX = 0
        if (x.get() < 0) {
          initialX = 0 + Math.abs(x.get())
        } else if (x.get() > 0) {
          initialX = 0 - x.get()
        }

        let initialY = 0
        if (y.get() < 0) {
          initialY = 0 + Math.abs(y.get())
        } else if (y.get() > 0) {
          initialY = 0 - y.get()
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

  const bind = useGesture(
    {
      onDrag: ({offset: [dx, dy]}) => {
        // Prevent panning when an image is being dragged
        for (let i = 0; i < images.length; i++) {
          if (images[i].dragging) return
        }
        api.start({ x: dx, y: dy })
      },
    },
  )

  const {getRootProps, getInputProps} = useDropzone({onDrop, noClick: true, noKeyboard: true})

  const handleImageDrag = (id: string, x: number, y: number) => {
    console.log('dragging: ', x, y)

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        setImages((prevImages) => prevImages.filter(image => !image.selected))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <>
      <div className="flex h-[calc(100dvh)] bg-orange-100" style={{touchAction: 'none'}} {...getRootProps()} {...bind()}>
        <input {...getInputProps()} />

        {/* debug */}
        {showDebug && (
          <div className="absolute z-10 top-0 left-0 p-4 text-white bg-black bg-opacity-50">
            <p>MouseX: {mousePosition.x}, MouseY: {mousePosition.y}</p>
            <p>PanX: {Math.floor(x.get())}, PanY:{Math.floor(y.get())}</p>
          </div>
        )}
        
        <animated.div
          style={{
            x: x,
            y: y,
            width: '100%',
            height: '100%',
            position: 'relative',
            border: '2px dashed black',
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
              className="absolute flex justify-center items-center cursor-pointer -left-11 w-10 h-10 text-white rounded bg-indigo-500 bg-opacity-70"
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
              className="absolute flex justify-center items-center cursor-pointer -left-11 w-10 h-10 text-white rounded bg-indigo-500 bg-opacity-70"
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
            <div
              className="absolute border-2 border-indigo-500 opacity-60 pointer-events-none select-none"
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
  const imagePos = useSpring({x: image.x, y: image.y})
  const [size, setSize] = useState({ width: image.width * image.scale, height: image.height * image.scale })

  const handleImageClick = (e: any) => {
    e.stopPropagation()
    onSelect()
  }

  const bind = useGesture(
    {
      onDrag: ({offset: [x, y], event}) => {
        event.stopPropagation()
        imagePos.x.set(x)
        imagePos.y.set(y)
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
        x: imagePos.x, 
        y: imagePos.y,
        touchAction: 'none',
        zIndex: image.zIndex,
      }}
      onClick={handleImageClick}
    >
      {/* debug */}
      {showDebug && (
        <div className="absolute top-0 left-0 p-4 text-white bg-black bg-opacity-50 select-none">
          <p>X: {Math.floor(imagePos.x.get())}, Y: {Math.floor(imagePos.y.get())}</p>
          <p>Dragging: {image.dragging ? 'true' : 'false'}</p>
          <p>Selected: {image.selected ? 'true' : 'false'}</p>
          <p>ZIndex: {image.zIndex}</p>
        </div>
      )}

      {image.selected && (
        <div
          {...resizeBind()}
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-indigo-500 cursor-nwse-resize rounded-sm select-none touch-none"
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
          border: image.selected ? '2px solid black' : 'none',
          userSelect: 'none',
        }}
        className="object-cover shadow-lg"
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

export default App
