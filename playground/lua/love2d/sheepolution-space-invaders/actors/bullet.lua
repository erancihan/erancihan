require 'core.actor'

Bullet = Actor:extend()

function Bullet:new(x, y)
    self.image = love.graphics.newImage('assets/kenney_simple-space/PNG/Retina/star_small.png')

    self.x = x
    self.y = y
    self.speed = 500

    self.scale = 1
    self.originX = self.image:getWidth() / 2
    self.originY = self.image:getHeight() / 2

    self.dead = false

    self.hitbox = Hitbox(self)
    self.hitbox.type = HITBOX_TYPES.POINT
end

function Bullet:onHit()
    -- bullet on hit callback
    -- mark the bullet as dead
    self.dead = true
end

function Bullet:update(dt)
    -- update the bullet position to go up
    self.y = self.y - self.speed * dt

    -- if the bullet is out of the screen, mark it as dead
    if self.y < 0 or self.y > love.graphics.getHeight() then
        self.dead = true
    end
end

function Bullet:draw()
    love.graphics.draw(self.image, self.x, self.y, 0, self.scale, self.scale, self.originX, self.originY)
end
