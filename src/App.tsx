import {useState, useEffect, useCallback, useRef} from 'react'
import {useDropzone} from 'react-dropzone'
import {useGesture} from '@use-gesture/react'
import {useSpring, animated} from '@react-spring/web'
import { v4 as uuidv4 } from 'uuid'

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
}

function App() {
  const [images, setImages] = useState<Image[]>([])
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }))
  const mousePosition = useMousePosition() || {x: 0, y: 0}
  const maxZIndex = useRef(1)

  const moveToFront = (id: string) => {
    console.log('moveToFront')
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

  const onDrop = useCallback((acceptedFiles: any) => {
    const file = acceptedFiles[0]

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = () => {
      const img = new Image()
      img.src = reader.result as string

      img.onload = () => {
        console.log({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        })

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
            zIndex: maxZIndex.current++
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
        <div className="absolute z-10 top-0 left-0 p-4 text-white bg-black bg-opacity-50">
          <p>MouseX: {mousePosition.x}, MouseY: {mousePosition.y}</p>
          <p>PanX: {Math.floor(x.get())}, PanY:{Math.floor(y.get())}</p>
        </div>
        
        <animated.div
          style={{
            x: x,
            y: y,
            width: '100%',
            height: '100%',
            position: 'relative',
            border: '2px dashed black',
          }}
        >
        {images.map((image: Image) => 
          <ImageComponent
            key={image.id} 
            image={image}
            onImageDrag={(x: number, y: number) => handleImageDrag(image.id, x, y)}
            onImageDragEnd={() => handleImageDragEnd(image.id)}
            onSelect={() => handleImageSelect(image.id)}
          />
        )}

        {images.filter(image => image.selected).map((image) => (
          <div key={image.id}>
            <button
              className="absolute flex justify-center items-center cursor-pointer -left-11 w-10 h-10 text-white rounded bg-indigo-500 bg-opacity-70"
              style={{
                left: `${image.x - 42}px`,
                top: `${image.y}px`,
                zIndex: 999,
              }}
              onClick={(e) => {
                console.log('moveToFront')
                e.stopPropagation()
                moveToFront(image.id)
              }}
              >
              <ArrowUpOnSquare />
            </button>
            <div
              className="absolute border-2 border-indigo-500 opacity-60"
              style={{
              left: `${image.x}px`,
              top: `${image.y}px`,
              width: `${image.width}px`,
              height: `${image.height}px`,
              zIndex: 999,
              pointerEvents: 'none',
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
}

function ImageComponent({image, onImageDrag, onImageDragEnd, onSelect}: ImagePropsTypes) {
  const imagePos = useSpring({x: image.x, y: image.y})

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
      <div className="absolute top-0 left-0 p-4 text-white bg-black bg-opacity-50">
        <p>X: {Math.floor(imagePos.x.get())}, Y: {Math.floor(imagePos.y.get())}</p>
        <p>Dragging: {image.dragging ? 'true' : 'false'}</p>
        <p>Selected: {image.selected ? 'true' : 'false'}</p>
        <p>ZIndex: {image.zIndex}</p>
      </div>
      
      <img 
        src={image.src} 
        draggable={false} 
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


export default App
