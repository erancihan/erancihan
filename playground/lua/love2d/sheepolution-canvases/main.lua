Lume = require("libs.lume")
Colors = require("libs.colors")

function saveGame()
    local data = {}
    data.player = {
        x = player.x,
        y = player.y,
        size = player.size,
    }

    data.coins = {}
    for i, v in ipairs(Coins) do
        data.coins[i] = { x = v.x, y = v.y }
    end

    data.Scores = Scores

    local serialized = Lume.serialize(data)
    love.filesystem.write("savegame.txt", serialized)
end

function loadGame()
    if not love.filesystem.getInfo("savegame.txt") then
        return false
    end

    local file = love.filesystem.read("savegame.txt")
    local data = Lume.deserialize(file)

    -- load from save
    Scores = data.score or 0

    for i, v in ipairs(data.players) do
        table.insert(
            Players,
            {
                x = v.x,
                y = v.y,
                size = v.size,
                image = love.graphics.newImage("assets/face.png"),
            }
        )
    end

    for i, v in ipairs(data.coins) do
        table.insert(
            Coins,
            {
                x = v.x,
                y = v.y,
                size = 10,
                image = love.graphics.newImage("assets/coin.png"),
            }
        )
    end

    return true
end

function doesCollide(p1, p2)
    local distanceSqr = ((p1.x - p2.x) ^ 2) + ((p1.y - p2.y) ^ 2)

    return distanceSqr < ((p1.size + p2.size) ^ 2)
end

function love.load()
    -- screen shake
    ShakeConf = {
        duration = 0,              -- how long the screen shake lasts
        wait = 0.05,               -- how long to wait between shakes
        offset = { x = 0, y = 0 }, -- how far the screen shakes
    }

    Scores = { 0, 0 }
    Players = {
        {
            x = 100,
            y = 100,
            size = 25,
            image = love.graphics.newImage("assets/face.png"),
            color = Colors.red,
        },
        {
            x = 300,
            y = 100,
            size = 25,
            image = love.graphics.newImage("assets/face.png"),
            color = Colors.cyan,
        }
    }

    Coins = {}

    -- load game
    -- if loadGame() then
    --     return
    -- end

    for i = 1, 25, 1 do
        table.insert(
            Coins,
            {
                x = love.math.random(50, love.graphics.getWidth()),
                y = love.math.random(50, love.graphics.getHeight()),
                size = 10,
                image = love.graphics.newImage("assets/coin.png"),
            }
        )
    end

    ScreenCanvas = love.graphics.newCanvas(400, 600)
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
    if ShakeConf.duration > 0 then
        ShakeConf.duration = ShakeConf.duration - dt
        if ShakeConf.wait > 0 then
            ShakeConf.wait = ShakeConf.wait - dt
        else
            ShakeConf.wait = 0.05 -- reset wait time
            ShakeConf.offset.x = love.math.random(-5, 5)
            ShakeConf.offset.y = love.math.random(-5, 5)
        end

        -- Clamp the duration to 0
        if ShakeConf.duration < 0 then
            ShakeConf.duration = 0
        end
    end

    -- Make it moveable with keyboard
    -- player 1
    local player1 = Players[1]
    if love.keyboard.isDown("left") then
        player1.x = player1.x - 200 * dt
    elseif love.keyboard.isDown("right") then
        player1.x = player1.x + 200 * dt
    end
    if love.keyboard.isDown("up") then
        player1.y = player1.y - 200 * dt
    elseif love.keyboard.isDown("down") then
        player1.y = player1.y + 200 * dt
    end

    -- player 2
    local player2 = Players[2]
    if love.keyboard.isDown("a") then
        player2.x = player2.x - 200 * dt
    elseif love.keyboard.isDown("d") then
        player2.x = player2.x + 200 * dt
    end
    if love.keyboard.isDown("w") then
        player2.y = player2.y - 200 * dt
    elseif love.keyboard.isDown("s") then
        player2.y = player2.y + 200 * dt
    end

    -- check for collisions with coins
    for i = #Coins, 1, -1 do
        local coin = Coins[i]
        for idx, player in ipairs(Players) do
            -- check if player collides with coin
            if doesCollide(player, coin) then
                table.remove(Coins, i)

                -- update score and player size
                player.size = player.size + 1
                Scores[idx] = Scores[idx] + 1
                -- ShakeConf.duration = 0.3 -- start screen shake
            end
        end
    end
end

function love.draw()
    for index, value in ipairs(Players) do
        love.graphics.setCanvas(ScreenCanvas)
        love.graphics.clear()
        drawGame(value)
        love.graphics.setCanvas()
        love.graphics.draw(ScreenCanvas, index == 1 and 0 or 400, 0)
    end

    love.graphics.setColor(1, 1, 1) -- reset color to white
    love.graphics.line(400, 0, 400, 600)
    for i, score in ipairs(Scores) do
        -- Draw the player score
        love.graphics.print("Player " .. i .. " Score: " .. score, 10, 30 + (i - 1) * 20)
    end
end

function drawGame(player)
    love.graphics.setColor(1, 1, 1) -- reset color to white

    love.graphics.push()

    love.graphics.translate(-player.x + 200, -player.y + 300)

    for _, p in ipairs(Players) do
        love.graphics.setColor(p.color or Colors.white)
        love.graphics.circle("line", p.x, p.y, p.size)
        love.graphics.draw(p.image, p.x, p.y, 0, 1, 1, p.image:getWidth() / 2, p.image:getHeight() / 2)
    end

    -- Draw the coins
    for i, coin in ipairs(Coins) do
        love.graphics.setColor(Colors.yellow) -- yellow for coins
        love.graphics.circle("line", coin.x, coin.y, coin.size)
        love.graphics.draw(coin.image, coin.x, coin.y, 0, 1, 1, coin.image:getWidth() / 2, coin.image:getHeight() / 2)
    end

    love.graphics.pop()

    love.graphics.setColor(1, 1, 1) -- reset color to white
end
