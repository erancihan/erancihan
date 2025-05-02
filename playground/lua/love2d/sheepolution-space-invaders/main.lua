Object = require 'libs.classic'
require 'actors.player'
require 'actors.enemy'
require 'actors.bullet'

-- local player

function love.load()
    player = Player()
    enemy = Enemy()

    listOfBullets = {}
end

function love.keypressed(key, scancode, isrepeat)
    player:keyPressed(key, listOfBullets)
end

function love.update(dt)
    player:update(dt)
    enemy:update(dt)

    -- update bullets
    for i, bullet in ipairs(listOfBullets) do
        bullet:update(dt)

        -- check for collision with enemy
        bullet:checkCollision(enemy)

        -- remove bullet if it is dead
        if bullet.dead then
            table.remove(listOfBullets, i)
        end
    end
end

function love.draw()
    love.graphics.print("FPS: " .. love.timer.getFPS(), 10, 5)
    -- print number of bullets
    love.graphics.print("Bullets: " .. #listOfBullets, 10, 20)

    player:draw()
    enemy:draw()

    -- draw bullets
    for i, bullet in ipairs(listOfBullets) do
        bullet:draw()
    end
end
