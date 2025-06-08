function love.draw()
    love.graphics.setColor({0/255, 234/255, 255/255, 0.6});
    love.graphics.circle("fill", 40, 40, 10, 16);
    love.graphics.setColor({0/255, 234/255, 255/255});
    love.graphics.circle("line", 40, 40, 10, 16);
end

function love.keyreleased(k)
    if k == "space" then
        love.graphics.captureScreenshot(function(imageData)
            local r, g, b = imageData:getPixel(32, 24)
            print(r * 255, g * 255, b * 255)
        end)
    end
end