io.stdout:setvbuf("no")

function love.load()
    circle = { x = 100, y = 100 }
    bullets = {}
end

function love.update(dt)
    for i, v in ipairs(bullets) do
        v.x = v.x + 400 * dt
        print(v.x)
    end
end

function love.draw()
    love.graphics.circle("fill", circle.x, circle.y, 50)

    for i, v in ipairs(bullets) do
        love.graphics.circle("fill", v.x, v.y, 10)
    end
end

function love.keypressed(key)
    print("key pressed:", key)
    if key == "space" then
        shoot()
    end
end

function shoot()
    table.insert(bullets, { x = circle.x, y = circle.y })
    
    print("number of bullets:", #bullets)
end
