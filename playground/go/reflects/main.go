package main

import (
	"fmt"
	"reflect"
)

type Model struct {
	FieldA string `mysql:"field_a" json:"out_a"`
	FieldB int    `mysql:"field_b" json:"out_b"`
}

func (m *Model) find(index int) {
	_m := reflect.ValueOf(&m).Elem()

	fieldC := reflect.Indirect(_m).NumField()
	for i := 0; i < fieldC; i++ {
		fieldName := reflect.Indirect(_m).Type().Field(i).Name
		fieldType := reflect.Indirect(_m).Type().Field(i).Type
		// fieldTags := reflect.Indirect(_m).Type().Field(i).Tag
		mysqlField := reflect.Indirect(_m).Type().Field(i).Tag.Get("mysql")

		// _assume_ fetch value

		// export field
		f := reflect.Indirect(_m).Field(i)
		if f.IsValid() && f.CanSet() {
			switch f.Kind() {
			case reflect.String:
				f.SetString("custom value")
			case reflect.Int:
				f.SetInt(1337)
			}
		}

		fmt.Printf("%v %7v (%v)\n", fieldName, fieldType, mysqlField)
	}
}

func main() {
	model := Model{}
	fmt.Printf("> A:%20s|B:%5v|\n", model.FieldA, model.FieldB)

	model.find(1)

	fmt.Printf("> A:%20s|B:%5v|\n", model.FieldA, model.FieldB)
}
