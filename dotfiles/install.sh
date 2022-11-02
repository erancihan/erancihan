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

case `uname` in
  Darwin)
    # commands for OSX
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    brew install gh gnupg tree htop
  ;;
  Linux)
    # commands for Linux
  ;;
esac

## install Node Version Manager
if [[ "$DRY_RUN" != true ]]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
fi

rm -rf ~/.oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

## copy config from repository
if [[ "$DRY_RUN" != true ]]; then
    curl -O https://raw.githubusercontent.com/erancihan/erancihan/master/dotfiles/.vimrc
    curl -O https://raw.githubusercontent.com/erancihan/erancihan/master/dotfiles/.p10k.zsh
    curl -O https://raw.githubusercontent.com/erancihan/erancihan/master/dotfiles/.zshrc
    curl -O https://raw.githubusercontent.com/erancihan/erancihan/master/dotfiles/.gitconfig
fi

## junegunn/vim-plug#installation
if [[ "$DRY_RUN" != true ]]; then
    curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
fi
