function love.load()
    song = love.audio.newSource("assets/audio/song.ogg", "stream")
    song:setLooping(true)
    song:play()

    sfx = love.audio.newSource("assets/audio/sfx.ogg", "static")
end

function love.keypressed(key)
    if key == "space" then
        sfx:play()
    end
end

