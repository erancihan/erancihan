#!/bin/bash

for key in "$@"
do
case $key in
    --dry-run)
    DRY_RUN=true
    shift ## past argument
    ;;
    ## EQUALS SEPARATED
    -e=*|--extension=*)
    EXTENSION="${key#*=}"
    shift ## past argument=value
    ;;
    *)  ## default:
        ##     skip unhandled command
    ;;
esac
done

if [[ "$DRY_RUN" = true ]]; then
    echo "> DRY RUN"
fi

## install Node Version Manager
if [[ "$DRY_RUN" != true ]]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
:'  
After NVM is installed it is upto user to install node from NVM. 
At this moment, I dont remember if NVM promts an interractive shell
or whether this script will break during execution.

Regardless, that is the problem of future me.
                                                Signed: 2021-01-17 04:00
                                                        @freedrone
'
fi

## copy config from repository
if [[ "$DRY_RUN" != true ]]; then    
    curl -O https://raw.githubusercontent.com/freedrone/dotfiles/master/.vimrc
    curl -O https://raw.githubusercontent.com/freedrone/dotfiles/master/.p10k.zsh
    curl -O https://raw.githubusercontent.com/freedrone/dotfiles/master/.zshrc
    curl -O https://raw.githubusercontent.com/freedrone/dotfiles/master/.gitconfig
fi

## junegunn/vim-plug#installation
if [[ "$DRY_RUN" != true ]]; then
    curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
fi
