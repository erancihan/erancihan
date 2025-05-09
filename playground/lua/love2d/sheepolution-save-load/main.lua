Lume = require("libs.lume")

function saveGame()
    local data = {}
    data.player = {
        x = player.x,
        y = player.y,
        size = player.size,
    }

    data.coins = {}
    for i, v in ipairs(coins) do
        data.coins[i] = { x = v.x, y = v.y }
    end

    local serialized = Lume.serialize(data)
    love.filesystem.write("savegame.txt", serialized)
end

function doesCollide(p1, p2)
    local distanceSqr = ((p1.x - p2.x) ^ 2) + ((p1.y - p2.y) ^ 2)

    return distanceSqr < ((p1.size + p2.size) ^ 2)
end

function love.load()
    -- Create a player object with an x, y and size
    player = {
        x = 100,
        y = 100,
        size = 25,
        image = love.graphics.newImage("assets/face.png"),
    }

    coins = {}

    if love.filesystem.getInfo("savegame.txt") then
        local file = love.filesystem.read("savegame.txt")
        local data = Lume.deserialize(file)

        -- load from save
        player.x = data.player.x
        player.y = data.player.y
        player.size = data.player.size

        for i, v in ipairs(data.coins) do
            table.insert(
                coins,
                {
                    x = v.x,
                    y = v.y,
                    size = 10,
                    image = love.graphics.newImage("assets/coin.png"),
                }
            )
        end
    else
        for i = 1, 25, 1 do
            table.insert(
                coins,
                {
                    x = love.math.random(50, love.graphics.getWidth()),
                    y = love.math.random(50, love.graphics.getHeight()),
                    size = 10,
                    image = love.graphics.newImage("assets/coin.png"),
                }
            )
        end
    end
end

function love.keypressed(key)
    if key == "f1" then
        saveGame()
    elseif key == "f2" then
        love.filesystem.remove("savegame.txt")
        love.event.quit("restart")
    end
end

function love.update(dt)
    -- Make it moveable with keyboard
    if love.keyboard.isDown("left") then
        player.x = player.x - 200 * dt
    elseif love.keyboard.isDown("right") then
        player.x = player.x + 200 * dt
    end

    -- Note how I start a new if-statement instead of contuing the elseif
    -- I do this because else you wouldn't be able to move diagonally.
    if love.keyboard.isDown("up") then
        player.y = player.y - 200 * dt
    elseif love.keyboard.isDown("down") then
        player.y = player.y + 200 * dt
    end

    for i = #coins, 1, -1 do
        local coin = coins[i]
        if doesCollide(player, coin) then
            table.remove(coins, i)
            player.size = player.size + 1
        end
    end
end

function love.draw()
    -- The players and coins are going to be circles
    love.graphics.circle("line", player.x, player.y, player.size)
    love.graphics.draw(player.image, player.x, player.y,
        0, 1, 1, player.image:getWidth() / 2, player.image:getHeight() / 2)

    -- draw the coins
    for i, coin in ipairs(coins) do
        love.graphics.circle("line", coin.x, coin.y, coin.size)
        love.graphics.draw(coin.image, coin.x, coin.y,
            0, 1, 1, coin.image:getWidth() / 2, coin.image:getHeight() / 2)
    end
end
