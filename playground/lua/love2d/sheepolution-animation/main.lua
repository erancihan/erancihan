-- https://sheepolution.com/learn/book/17

function love.load()
    image = love.graphics.newImage("assets/jump.png")

    local framesW = 117
    local framesH = 233

    frames = {}

    for i = 0, 4 do
        local x = 1 + ((i % 3) * (framesW + 2))
        local y = 1 + (math.floor(i / 3) * (framesH + 2))

        table.insert(frames, love.graphics.newQuad(x, y, framesW, framesH, image:getDimensions()))
    end

    currentFrame = 1
end

function love.update(dt)
    currentFrame = currentFrame + 10 * dt
    if currentFrame > #frames then
        currentFrame = 1
    end
end

function love.draw()
    love.graphics.draw(image, frames[math.floor(currentFrame)], 100, 100)
end
