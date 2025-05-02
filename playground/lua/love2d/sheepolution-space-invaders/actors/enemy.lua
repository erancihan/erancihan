require 'core.actor'

Enemy = Actor:extend()

function Enemy:new()
    self.image = love.graphics.newImage('assets/kenney_simple-space/PNG/Retina/enemy_A.png')

    self.x = 325
    self.y = 64 -- place the enemy at the top of the screen
    self.speed = 100

    self.scale = 1
    self.originX = self.image:getWidth() / 2
    self.originY = self.image:getHeight() / 2

    self.hitbox = Hitbox(self)
    self.hitbox.type = HITBOX_TYPES.RECTANGLE
    self.hitbox.dl = -self.image:getWidth() / 2
    self.hitbox.dr = self.image:getWidth() / 2
    self.hitbox.dt = -self.image:getHeight() / 2
    self.hitbox.db = self.image:getHeight() / 2
end

function Enemy:onHit()
    -- enemy on hit callback
    -- increase speed on the direction of the enemy

    if self.speed > 0 then
        self.speed = self.speed + 50
    else
        self.speed = self.speed - 50
    end
end

function Enemy:update(dt)
    self.x = self.x + self.speed * dt

    local windowW = love.graphics.getWidth()

    -- clamp enemy position to window width
    if (self.x - self.originX) < 0 then
        self.x = self.originX
        self.speed = -self.speed
    elseif (self.x + self.originX) > windowW then
        self.x = windowW - self.originX
        self.speed = -self.speed
    end
end

function Enemy:draw()
    -- mirror the image on the y-axis
    love.graphics.draw(self.image, self.x, self.y, 0, 1, -1, self.image:getWidth() / 2, self.image:getHeight() / 2)

    love.graphics.print("Enemy: " .. self.x .. "," .. self.y, 10, 50)
end
