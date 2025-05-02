function love.load()
    tilemap = { 1, 0, 0, 1, 1, 0, 1, 1, 1, 0 }
end

function love.draw()
    for i,v in ipairs(tilemap) do
        if v == 1 then
            love.graphics.rectangle("line", i * 25, 100, 25, 25)
        end
    end
end