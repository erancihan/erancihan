package main

import (
	"encoding/json"
	"fmt"
)

type LinkedMapElement struct {
	Value string
	Links map[byte]*LinkedMapElement
}

type LinkedMap struct {
	link LinkedMapElement
}

func (lmap *LinkedMap) find(key string, index int, cursor *LinkedMapElement) *LinkedMapElement {
	if index == len(key) {
		return cursor
	}

	next, found := cursor.Links[key[index]]
	if !found {
		cursor.Links[key[index]] = &LinkedMapElement{
			Value: "",
			Links: make(map[byte]*LinkedMapElement),
		}
		next, found = cursor.Links[key[index]]
		if !found {
			panic("cursor cannot be empty after assignment")
		}
	}

	index++
	return lmap.find(key, index, next)
}

func (lmap *LinkedMap) Set(key string, value string) string {
	target := lmap.find(key, 0, &lmap.link)
	target.Value = value

	return target.Value
}

func (lmap *LinkedMap) Get(key string) (result string) {
	return lmap.find(key, 0, &lmap.link).Value
}

func NewLinkedMap() *LinkedMap {
	lm := LinkedMap{
		link: LinkedMapElement{
			Value: "",
			Links: make(map[byte]*LinkedMapElement),
		},
	}

	return &lm
}

func main() {
	l := NewLinkedMap()

	l.Set("a", "value_a1")
	l.Set("a", "value_a2")
	l.Set("b", "value_b")
	l.Set("myKey", "value_myKey")
	l.Set("my", "value_my")
	l.Set("myA", "value_myA")
	l.Set("", "value_")

	b, _ := json.MarshalIndent(l.link, "", "    ")
	fmt.Printf("%v\n", string(b))

	fmt.Printf("get >  %s\n", l.Get(""))
}
