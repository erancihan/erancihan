require 'core.hitbox'

Object = require 'libs.classic'

Actor = Object:extend()

function Actor:new()
    -- constructor
    self.image = nil

    self.x = 0
    self.y = 0
    self.width = 0
    self.height = 0

    self.scale = 1
    self.originX = 0
    self.originY = 0

    self.dead = true  -- dead by default

    self.hitbox = nil -- hitbox object
end

function Actor:onHit(obj)
    -- on hit callback
    -- to be implemented by subclasses
end

function Actor:checkCollision(obj)
    -- Check if the actor collides with the given object
    if self.hitbox == nil or obj.hitbox == nil then
        return
    end

    if HITBOX_HANDLERS[self.hitbox.type][obj.hitbox.type](self, obj) then
        -- invoke the onHit callback on the target object
        if obj.onHit then
            obj:onHit(self)
        end
        -- invoke the onHit callback on the actor object
        if self.onHit then
            self:onHit(obj)
        end
    end
end

function Actor:update(dt)
    -- update the actor
    -- to be implemented by subclasses
end

function Actor:draw()
    -- draw the actor
    love.graphics.draw(self.image, self.x, self.y, 0, self.scale, self.scale, self.originX, self.originY)
end
