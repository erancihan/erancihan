require 'core.actor'

Player = Actor:extend()

function Player:new()
    self.image = love.graphics.newImage('assets/kenney_simple-space/PNG/Retina/ship_L.png')

    self.x = 300
    self.y = love.graphics.getHeight() - self.image:getHeight() -- place the player at the bottom of the screen
    self.speed = 500

    self.width = self.image:getWidth()
end

function Player:keyPressed(key, listOfBullets)
    if key == "space" then
        -- shoot a bullet from the player's position
        table.insert(listOfBullets, Bullet(self.x + self.width / 2, self.y))
    end
end

function Player:update(dt)
    if love.keyboard.isDown("left") then
        self.x = self.x - self.speed * dt
    end
    if love.keyboard.isDown("right") then
        self.x = self.x + self.speed * dt
    end

    -- get window width
    local windowW = love.graphics.getWidth()

    -- clamp player position to window width
    if self.x < 0 then
        self.x = 0
    elseif self.x > (windowW - self.width) then
        self.x = windowW - self.width
    end
end

function Player:draw()
    love.graphics.draw(self.image, self.x, self.y, 0, 1, 1)
    love.graphics.print("Player: " .. self.x .. "," .. self.y, 10, 35)
end
