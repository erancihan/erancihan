# Path to your oh-my-zsh installation.
export ZSH="${HOME}/.oh-my-zsh"

if [[ ! -d "$ZSH/custom/themes/powerlevel10k" ]];
then
    echo "p10k does not exist, cloning"
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
    echo "run ' p10k configure' to install font, or go to link for manual install"
    echo "https://github.com/romkatv/powerlevel10k#meslo-nerd-font-patched-for-powerlevel10k"
fi

export PATH="$PATH:$HOME/.venv/bin:$HOME/.local/bin:$HOME/.composer/vendor/bin"

######################################## ZSH config

# ZSH_THEME="robbyrussell"
ZSH_THEME="powerlevel10k/powerlevel10k"

DISABLE_VENV_CD=1

plugins=(
    git
    # virtualenvwrapper
)

source $ZSH/oh-my-zsh.sh

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
# Lines configured by zsh-newuser-install
HISTFILE=~/.histfile
HISTSIZE=1000
SAVEHIST=1000
unsetopt beep
setopt sharehistory
bindkey -e
# End of lines configured by zsh-newuser-install
# The following lines were added by compinstall
zstyle :compinstall filename "$HOME/.zshrc"

autoload -Uz compinit
compinit
# End of lines added by compinstall

######################################## 

# Node Version Manager
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# homebrew home directory
HOMEBREW_PREFIX="/opt/homebrew"

case `uname` in
    Darwin)
        HOMEBREW_PREFIX="/opt/homebrew"

        # Android SDK
        if [ -d "$HOME/Library/Android/sdk" ]
        then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
            export ANDROID_NDK_HOME="$HOMEBREW_PREFIX/share/android-ndk"
        fi
    ;;
    Linux)
        HOMEBREW_PREFIX="/home/linuxbrew/.linuxbrew"

        # Plex home directory
        export PLEX_HOME="/opt/plex/"

        # Android SDK
        if [ -d "$HOME/Programs/Android/Sdk" ]
        then
            export ANDROID_HOME="$HOME/Programs/Android/Sdk"
            export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
        fi
    ;;
esac

# Homebrew
if [ -d "$HOMEBREW_PREFIX/bin" ]
then
    export PATH="$HOMEBREW_PREFIX/bin:$PATH"
fi

# OpenJDK
if [ -d "$HOMEBREW_PREFIX/opt/openjdk/bin" ]
then
    export PATH="$HOMEBREW_PREFIX/opt/openjdk/bin:$PATH"
    export CPPFLAGS="-I$HOMEBREW_PREFIX/opt/openjdk/include"
fi

# Ruby
if [ -d "$HOMEBREW_PREFIX/opt/ruby/bin" ]
then
    export PATH="$HOMEBREW_PREFIX/opt/ruby/bin:$PATH"
fi

######################################## setup resources folder
if [ ! -d "$HOME/w/res" ]
then
    mkdir -p "$HOME/w/res"
fi

# GoLang
export GOPATH="$HOME/w/res/go"

## gcloud setup
if [ -d "$HOME/w/res/google-cloud-sdk" ]
then
    export PATH="$PATH:$HOME/w/res/google-cloud-sdk/bin"

    # The next line enables shell command completion for gcloud.
    if [ -f "$HOME/w/res/google-cloud-sdk/completion.zsh.inc" ];
    then
        . "$HOME/w/res/google-cloud-sdk/completion.zsh.inc";
    fi
fi

# Laravel | Sail
alias sail=./vendor/bin/sail

# GitHub CLI completion
compctl -K _gh gh

export GPG_TTY=$(tty)
