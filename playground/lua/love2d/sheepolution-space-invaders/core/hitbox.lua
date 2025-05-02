Object = require 'libs.classic'

-- handler functions for hitbox types
-- |           |           circle            |         rectangle         | point
-- | circle    | collisionCheckCIRCLEvCIRCLE | collisionCheckCIRCLEvAABB |
-- | rectangle | collisionCheckCIRCLEvAABB   | collisionCheckAABBvAABB   |
-- | point     | collisionCheckPOINTvCIRCLE  | collisionCheckPOINTvAABB  | collisionCheckPOINTvPOINT

local function collisionCheckCIRCLEvCIRCLE(hitboxA, hitboxB)
    -- https://developer.arm.com/documentation/102467/0201/Example---collision-detection
    -- two circles collide if the distance from a.center to b.center is less than the sum of their radii
    --    or equivalently, if the squared distance is less than the sum of their radii squared
    --  sqrt(dx^2 + dy^2)   <=  (a.radius + b.radius)
    --  dx^2 + dy^2         <=  (a.radius + b.radius)^2
    local dx = hitboxA.owner.x - hitboxB.owner.x
    local dy = hitboxA.owner.y - hitboxB.owner.y

    local dsqr = dx * dx + dy * dy
    local radsqr = (hitboxA.radius + hitboxB.radius) * (hitboxA.radius + hitboxB.radius)

    return dsqr <= radsqr
end

-- rectangle to rectangle collision check
local function collisionCheckAABBvAABB(hitboxA, hitboxB)
    -- check if the two rectangles intersect or overlap
    return
        hitboxA.owner.x + hitboxA.dl <= hitboxB.owner.x + hitboxB.dr and
        hitboxA.owner.x + hitboxA.dr >= hitboxB.owner.x + hitboxB.dl and
        hitboxA.owner.y + hitboxA.dt <= hitboxB.owner.y + hitboxB.db and
        hitboxA.owner.y + hitboxA.db >= hitboxB.owner.y + hitboxB.dt
end

-- rectangle to circle collision check
local function collisionCheckCIRCLEvAABB(hitboxA, hitboxB)
    -- check if the circle intersects with the rectangle
    local closestX = math.max(hitboxB.owner.x + hitboxB.dl, math.min(hitboxA.owner.x, hitboxB.owner.x + hitboxB.dr))
    local closestY = math.max(hitboxB.owner.y + hitboxB.dt, math.min(hitboxA.owner.y, hitboxB.owner.y + hitboxB.db))

    local dx = hitboxA.owner.x - closestX
    local dy = hitboxA.owner.y - closestY

    return (dx * dx + dy * dy) < (hitboxA.radius * hitboxA.radius)
end

local function collisionCheckPOINTvCIRCLE(hitboxA, hitboxB)
    -- check if the point is within the circle
    local dx = hitboxA.owner.x - hitboxB.owner.x
    local dy = hitboxA.owner.y - hitboxB.owner.y

    return (dx * dx + dy * dy) < (hitboxB.radius * hitboxB.radius)
end

local function collisionCheckPOINTvAABB(point, aabb)
    -- check if the point is within the rectangle
    return
        point.owner.x >= aabb.owner.x + aabb.dl and
        point.owner.x <= aabb.owner.x + aabb.dr and
        point.owner.y >= aabb.owner.y + aabb.dt and
        point.owner.y <= aabb.owner.y + aabb.db
end

local function collisionCheckPOINTvPOINT(pointA, pointB)
    -- check if the two points are equal
    return pointA.owner.x == pointB.owner.x and pointA.owner.y == pointB.owner.y
end

-- Hitbox Types Enum
HITBOX_TYPES = {
    POINT = 0,
    CIRCLE = 1,
    RECTANGLE = 2,
}

HITBOX_HANDLERS = {
    [HITBOX_TYPES.POINT] = {
        [HITBOX_TYPES.POINT] = function(hitboxA, hitboxB)
            return collisionCheckPOINTvPOINT(hitboxA, hitboxB)
        end,
        [HITBOX_TYPES.CIRCLE] = function(hitboxA, hitboxB)
            return collisionCheckPOINTvCIRCLE(hitboxA, hitboxB)
        end,
        [HITBOX_TYPES.RECTANGLE] = function(hitboxA, hitboxB)
            return collisionCheckPOINTvAABB(hitboxA, hitboxB)
        end,
    },
    [HITBOX_TYPES.CIRCLE] = {
        [HITBOX_TYPES.POINT] = function(hitboxA, hitboxB)
            return collisionCheckPOINTvCIRCLE(hitboxB, hitboxA)
        end,
        [HITBOX_TYPES.CIRCLE] = function(hitboxA, hitboxB)
            return collisionCheckCIRCLEvCIRCLE(hitboxA, hitboxB)
        end,
        [HITBOX_TYPES.RECTANGLE] = function(hitboxA, hitboxB)
            return collisionCheckCIRCLEvAABB(hitboxA, hitboxB)
        end,
    },
    [HITBOX_TYPES.RECTANGLE] = {
        [HITBOX_TYPES.POINT] = function(hitboxA, hitboxB)
            return collisionCheckPOINTvAABB(hitboxB, hitboxA)
        end,
        [HITBOX_TYPES.CIRCLE] = function(hitboxA, hitboxB)
            return collisionCheckCIRCLEvAABB(hitboxB, hitboxA)
        end,
        [HITBOX_TYPES.RECTANGLE] = function(hitboxA, hitboxB)
            return collisionCheckAABBvAABB(hitboxA, hitboxB)
        end,
    },
}

-- Hitbox class
Hitbox = Object:extend()

function Hitbox:new(owner)
    self.owner = owner -- the actor that owns this hitbox

    -- TODO: enumerate
    self.type = HITBOX_TYPES.CIRCLE -- default type

    -- for circle hitbox
    self.radius = 0

    -- for rectangle hitbox, bounding box from object's center
    self.dl = 0
    self.dr = 0
    self.dt = 0
    self.db = 0
end

function Hitbox:collidesWith(otherHitbox)
    return HITBOX_HANDLERS[self.type][otherHitbox.type](self, otherHitbox)
end
