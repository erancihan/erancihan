local actor
local mouseX, mouseY

function getDistance(x1, y1, x2, y2)
    local horizontalDistance = x1 - x2
    local verticalDistance = y1 - y2

    local a = horizontalDistance * horizontalDistance
    local b = verticalDistance ^ 2

    return math.sqrt(a + b)
end

function love.load()
    actor = {}

    actor.x = 100
    actor.y = 100
    actor.radius = 25
    actor.speed = 200

    actor.angle = 0
    actor.image = love.graphics.newImage("assets/arrow_right.png")
    actor.originX = actor.image:getWidth() / 2
    actor.originY = actor.image:getHeight() / 2
end

function love.update(dt)
    -- love.mouse.getPosition() returns the x and y position of the cursor
    mouseX, mouseY = love.mouse.getPosition()

    actor.angle = math.atan2(mouseY - actor.y, mouseX - actor.x)
    local cos = math.cos(actor.angle)
    local sin = math.sin(actor.angle)

    -- get close to the mouse if mouse is closer than 400 pixels
    local distance = getDistance(actor.x, actor.y, mouseX, mouseY)
    if distance < 400 then
        -- move the circle towards the mouse
        -- slow down as getting closer to the mouse
        actor.x = actor.x + cos * actor.speed * dt * (distance / 100)
        actor.y = actor.y + sin * actor.speed * dt * (distance / 100)
    end
end

function love.draw()
    love.graphics.circle("line", actor.x, actor.y, actor.radius)

    -- print the angle in
    love.graphics.print("Angle: " .. math.deg(actor.angle), 10, 10)
    love.graphics.print("Distance: " .. getDistance(actor.x, actor.y, mouseX, mouseY), 10, 30)

    -- visualize
    love.graphics.line(actor.x, actor.y, mouseX, mouseY)
    love.graphics.line(actor.x, actor.y, mouseX, actor.y)
    love.graphics.line(mouseX, mouseY, mouseX, actor.y)

    love.graphics.circle("line", actor.x, actor.y, getDistance(actor.x, actor.y, mouseX, mouseY))

    love.graphics.draw(actor.image, actor.x, actor.y, actor.angle, 1, 1, actor.originX, actor.originY)
end
