Object = require 'libs.classic'

-- handler functions for hitbox types
-- |           |           circle            |         rectangle         | point
-- | circle    | collisionCheckCIRCLEvCIRCLE | collisionCheckCIRCLEvAABB |
-- | rectangle | collisionCheckCIRCLEvAABB   | collisionCheckAABBvAABB   |
-- | point     | collisionCheckPOINTvCIRCLE  | collisionCheckPOINTvAABB  | collisionCheckPOINTvPOINT

local function collisionCheckCIRCLEvCIRCLE(actorA, actorB)
    -- https://developer.arm.com/documentation/102467/0201/Example---collision-detection
    -- two circles collide if the distance from a.center to b.center is less than the sum of their radii
    --    or equivalently, if the squared distance is less than the sum of their radii squared
    --  sqrt(dx^2 + dy^2)   <=  (a.radius + b.radius)
    --  dx^2 + dy^2         <=  (a.radius + b.radius)^2
    local dx = actorA.hitbox.x - actorB.hitbox.x
    local dy = actorA.hitbox.y - actorB.hitbox.y

    local dsqr = dx * dx + dy * dy
    local radsqr = (actorA.hitbox.radius + actorB.hitbox.radius) * (actorA.hitbox.radius + actorB.hitbox.radius)

    return dsqr <= radsqr
end

-- rectangle to rectangle collision check
local function collisionCheckAABBvAABB(actorA, actorB)
    -- check if the two rectangles intersect or overlap
    return
        actorA.x + actorA.hitbox.dl <= actorB.x + actorB.hitbox.dr and
        actorA.x + actorA.hitbox.dr >= actorB.x + actorB.hitbox.dl and
        actorA.y + actorA.hitbox.dt <= actorB.y + actorB.hitbox.db and
        actorA.y + actorA.hitbox.db >= actorB.y + actorB.hitbox.dt
end

-- rectangle to circle collision check
local function collisionCheckCIRCLEvAABB(circle, aabb)
    -- check if the circle intersects with the rectangle
    local closestX = math.max(aabb.x + aabb.hitbox.dl, math.min(circle.x, aabb.x + aabb.hitbox.dr))
    local closestY = math.max(aabb.y + aabb.hitbox.dt, math.min(circle.y, aabb.y + aabb.hitbox.db))

    local dx = circle.x - closestX
    local dy = circle.y - closestY

    return (dx * dx + dy * dy) < (circle.hitbox.radius * circle.hitbox.radius)
end

local function collisionCheckPOINTvCIRCLE(point, circle)
    -- check if the point is within the circle
    local dx = point.x - circle.x
    local dy = point.y - circle.y

    return (dx * dx + dy * dy) < (circle.hitbox.radius * circle.hitbox.radius)
end

local function collisionCheckPOINTvAABB(point, aabb)
    -- check if the point is within the rectangle
    return
        point.x >= aabb.x + aabb.hitbox.dl and
        point.x <= aabb.x + aabb.hitbox.dr and
        point.y >= aabb.y + aabb.hitbox.dt and
        point.y <= aabb.y + aabb.hitbox.db
end

local function collisionCheckPOINTvPOINT(pointA, pointB)
    -- check if the two points are equal
    return pointA.x == pointB.x and pointA.y == pointB.y
end

-- Hitbox Types Enum
HITBOX_TYPES = {
    POINT = 0,
    CIRCLE = 1,
    RECTANGLE = 2,
}

HITBOX_HANDLERS = {
    [HITBOX_TYPES.POINT] = {
        [HITBOX_TYPES.POINT] = function(actorA, actorB)
            return collisionCheckPOINTvPOINT(actorA, actorB)
        end,
        [HITBOX_TYPES.CIRCLE] = function(actorA, actorB)
            return collisionCheckPOINTvCIRCLE(actorA, actorB)
        end,
        [HITBOX_TYPES.RECTANGLE] = function(actorA, actorB)
            return collisionCheckPOINTvAABB(actorA, actorB)
        end,
    },
    [HITBOX_TYPES.CIRCLE] = {
        [HITBOX_TYPES.POINT] = function(actorA, actorB)
            return collisionCheckPOINTvCIRCLE(actorB, actorA)
        end,
        [HITBOX_TYPES.CIRCLE] = function(actorA, actorB)
            return collisionCheckCIRCLEvCIRCLE(actorA, actorB)
        end,
        [HITBOX_TYPES.RECTANGLE] = function(actorA, actorB)
            return collisionCheckCIRCLEvAABB(actorA, actorB)
        end,
    },
    [HITBOX_TYPES.RECTANGLE] = {
        [HITBOX_TYPES.POINT] = function(actorA, actorB)
            return collisionCheckPOINTvAABB(actorB, actorA)
        end,
        [HITBOX_TYPES.CIRCLE] = function(actorA, actorB)
            return collisionCheckCIRCLEvAABB(actorB, actorA)
        end,
        [HITBOX_TYPES.RECTANGLE] = function(actorA, actorB)
            return collisionCheckAABBvAABB(actorA, actorB)
        end,
    },
}

-- Hitbox class
Hitbox = Object:extend()

function Hitbox:new()
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
