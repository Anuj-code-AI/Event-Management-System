package org.anuj.EvenTAura.util;

import org.springframework.core.convert.converter.Converter;
import org.anuj.EvenTAura.model.enums.SortDirection;
import org.springframework.stereotype.Component;

@Component
public class SortDirectionConverter implements Converter<String, SortDirection> {

    @Override
    public SortDirection convert(String source) {
        return SortDirection.valueOf(source.trim().toUpperCase());
    }
}